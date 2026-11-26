'use server';

import { z } from 'zod';

import { HitAThonErrors, PLAYER_HAS_PLEDGES } from '@/features/contests/constants';
import type { HitPlayer } from '@/features/contests/utils/hit-players';
import { generatePlayerSlug } from '@/features/contests/utils/player-slug';
import type { ActionResponse } from '@/types/action-response';

import { ValidationError, withContestOwnership } from '../middleware/auth-middleware';

// The database's rules (hit_players): first names only, 1 to 40 characters, trimmed; an optional positive number.
const newPlayerSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  number: z.number().int().positive().optional(),
});

/** Adds a player to the owner's hit-a-thon. */
export async function addHitPlayer(
  contestId: string,
  input: { firstName: string; number?: number }
): Promise<ActionResponse<HitPlayer>> {
  return withContestOwnership<HitPlayer>(contestId, async (_user, supabase, contest) => {
    const parsed = newPlayerSchema.safeParse(input);
    if (!parsed.success || contest.kind !== 'hit_a_thon') {
      throw new Error('Invalid player');
    }
    const { firstName, number } = parsed.data;

    // The link slug comes from the first name, unique within the contest
    const { data: existing, error: readError } = await supabase
      .from('hit_players')
      .select('first_name, slug')
      .eq('contest_id', contestId);
    if (readError) throw readError;

    if (existing.some((p) => p.first_name.toLowerCase() === firstName.toLowerCase())) {
      throw new ValidationError(HitAThonErrors.DUPLICATE_PLAYER);
    }

    const slug = generatePlayerSlug(
      firstName,
      existing.map((p) => ({ name: p.first_name, slug: p.slug }))
    );

    const { data, error } = await supabase
      .from('hit_players')
      .insert({ contest_id: contestId, first_name: firstName, number: number ?? null, slug })
      .select('id, first_name, number, slug')
      .single();

    if (error) {
      // hit_players_contest_first_name_idx: added in between
      if (error.code === '23505' && error.message.includes('first_name')) {
        throw new ValidationError(HitAThonErrors.DUPLICATE_PLAYER);
      }
      throw error;
    }

    return data;
  })();
}

/** Removes a player. Refused while the player has pledges, cancelled ones included (the database's foreign key). */
export async function removeHitPlayer(contestId: string, playerId: string): Promise<ActionResponse<{ id: string }>> {
  return withContestOwnership<{ id: string }>(contestId, async (_user, supabase) => {
    if (typeof playerId !== 'string') {
      throw new Error('Invalid player');
    }

    const { data, error } = await supabase
      .from('hit_players')
      .delete()
      .eq('contest_id', contestId)
      .eq('id', playerId)
      .select('id, first_name');

    if (error) {
      if (error.code === '23503') {
        const { data: player } = await supabase
          .from('hit_players')
          .select('first_name')
          .eq('contest_id', contestId)
          .eq('id', playerId)
          .maybeSingle();
        if (player) throw new ValidationError(PLAYER_HAS_PLEDGES(player.first_name));
      }
      throw error;
    }
    if (!data.length) {
      throw new Error('Player not found');
    }

    return { id: data[0].id };
  })();
}
