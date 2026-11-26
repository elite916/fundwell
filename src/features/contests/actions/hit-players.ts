'use server';

import { z } from 'zod';

import { HitAThonErrors, HITS_RANGE, PLAYER_HAS_PLEDGES } from '@/features/contests/constants';
import type { HitPlayer } from '@/features/contests/utils/hit-players';
import { generatePlayerSlug } from '@/features/contests/utils/player-slug';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
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

/**
 * Removes a player. Refused while the player has a pledge that isn't cancelled. Their cancelled pledges are deleted
 * first (the service role: owners can't delete pledges), since the database's foreign key refuses removing a player
 * with any pledge. A pledge made in between keeps the player: the foreign key refuses the delete.
 */
export async function removeHitPlayer(contestId: string, playerId: string): Promise<ActionResponse<{ id: string }>> {
  return withContestOwnership<{ id: string }>(contestId, async (_user, supabase) => {
    if (typeof playerId !== 'string') {
      throw new Error('Invalid player');
    }

    const { data: player, error: playerError } = await supabase
      .from('hit_players')
      .select('first_name')
      .eq('contest_id', contestId)
      .eq('id', playerId)
      .maybeSingle();
    if (playerError) throw playerError;
    if (!player) {
      throw new Error('Player not found');
    }

    const { count, error: countError } = await supabase
      .from('pledges')
      .select('id', { count: 'exact', head: true })
      .eq('contest_id', contestId)
      .eq('player_id', playerId)
      .neq('status', 'cancelled');
    if (countError) throw countError;
    if (count) {
      throw new ValidationError(PLAYER_HAS_PLEDGES(player.first_name));
    }

    // Their contacts go with them (on delete cascade)
    const { error: pledgesError } = await supabaseAdminClient
      .from('pledges')
      .delete()
      .eq('contest_id', contestId)
      .eq('player_id', playerId)
      .eq('status', 'cancelled');
    if (pledgesError) throw pledgesError;

    const { data, error } = await supabase
      .from('hit_players')
      .delete()
      .eq('contest_id', contestId)
      .eq('id', playerId)
      .select('id');

    if (error) {
      // A pledge arrived in between
      if (error.code === '23503') {
        throw new ValidationError(PLAYER_HAS_PLEDGES(player.first_name));
      }
      throw error;
    }
    if (!data.length) {
      throw new Error('Player not found');
    }

    return { id: data[0].id };
  })();
}

/**
 * Saves the hits entered on the owner's overview. Each count is a whole number from 0 to the pitches per player, or
 * empty (not entered yet). Only changed counts are written.
 */
export async function saveHits(
  contestId: string,
  entries: { playerId: string; hits: number | null }[]
): Promise<ActionResponse<{ saved: number }>> {
  return withContestOwnership<{ saved: number }>(contestId, async (_user, supabase, contest) => {
    if (contest.kind !== 'hit_a_thon' || contest.pitches_per_player === null) {
      throw new Error('Not a hit-a-thon');
    }
    const pitches = contest.pitches_per_player;

    const parsed = z
      .array(z.object({ playerId: z.string(), hits: z.number().int().min(0).max(pitches).nullable() }))
      .safeParse(entries);
    if (!parsed.success) {
      throw new ValidationError(HITS_RANGE(pitches));
    }

    const { data: players, error: readError } = await supabase
      .from('hit_players')
      .select('id, hits')
      .eq('contest_id', contestId);
    if (readError) throw readError;

    const current = new Map(players.map((p) => [p.id, p.hits]));
    const changed = parsed.data.filter((e) => current.has(e.playerId) && current.get(e.playerId) !== e.hits);

    for (const { playerId, hits } of changed) {
      const { data, error } = await supabase
        .from('hit_players')
        .update({ hits })
        .eq('contest_id', contestId)
        .eq('id', playerId)
        .select('id');

      if (error) {
        // Pitches lowered in between (enforce_hit_player_rules)
        if (error.message.includes('hits_over_pitches')) {
          throw new ValidationError(HITS_RANGE(pitches));
        }
        throw error;
      }
      if (!data.length) {
        throw new Error('Player not found');
      }
    }

    return { saved: changed.length };
  })();
}
