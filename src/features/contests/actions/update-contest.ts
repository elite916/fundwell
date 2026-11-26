'use server';

import {
  ContestErrors,
  ContestStatus,
  hasGameStarted,
  HitAThonErrors,
  PITCHES_BELOW_HITS,
} from '@/features/contests/constants';
import type { ContestUpdate } from '@/features/contests/types';
import { isSeasonOpen } from '@/features/super-bowl/queries';
import { SUPER_BOWL_SEASON } from '@/features/super-bowl/season';
import type { ActionResponse } from '@/types/action-response';

import { ValidationError, withContestOwnership } from '../middleware/auth-middleware';

// Columns the settings forms may change. Anything else is rejected.
// Status changes go through updateContestStatus (dashboard/[contestId]/actions.ts).
// The database grants owners the same columns (contest_write_rules migration), so a
// new column needs a grant too.
const UPDATABLE_COLUMNS = [
  'is_public',
  'name',
  'description',
  'row_team_name',
  'col_team_name',
  'super_bowl_season',
  'square_price',
  'max_squares_per_person',
  'prize_type',
  'payout_q1_percent',
  'payout_q2_percent',
  'payout_q3_percent',
  'payout_final_percent',
  'payout_game1_percent',
  'payout_game2_percent',
  'payout_game3_percent',
  'payout_game4_percent',
  'payout_game5_percent',
  'payout_game6_percent',
  'payout_game7_percent',
  'prize_q1_text',
  'prize_q2_text',
  'prize_q3_text',
  'prize_final_text',
  'hero_image_url',
  'hero_image_position',
  'org_image_url',
  'primary_color',
  'secondary_color',
  'enable_player_tracking',
  'players',
  'pitches_per_player',
  'player_goal',
] as const satisfies readonly (keyof ContestUpdate)[];

// Columns that can't change once the game starts. The database enforces the same
// list (lock_at_kickoff migration).
const LOCKED_AFTER_START = [
  'square_price',
  'max_squares_per_person',
  'prize_type',
  'payout_q1_percent',
  'payout_q2_percent',
  'payout_q3_percent',
  'payout_final_percent',
  'payout_game1_percent',
  'payout_game2_percent',
  'payout_game3_percent',
  'payout_game4_percent',
  'payout_game5_percent',
  'payout_game6_percent',
  'payout_game7_percent',
  'prize_q1_text',
  'prize_q2_text',
  'prize_q3_text',
  'prize_final_text',
] as const satisfies readonly (typeof UPDATABLE_COLUMNS)[number][];

export type ContestSettingsUpdate = Pick<ContestUpdate, (typeof UPDATABLE_COLUMNS)[number]>;

function isSettingsUpdate(updates: unknown): updates is ContestSettingsUpdate {
  if (typeof updates !== 'object' || updates === null || Array.isArray(updates)) return false;
  return Object.keys(updates).every((key) => (UPDATABLE_COLUMNS as readonly string[]).includes(key));
}

/**
 * Updates a contest. Only the owner can update their contest.
 */
export async function updateContest(
  contestId: string,
  updates: ContestSettingsUpdate
): Promise<ActionResponse<{ id: string }>> {
  return withContestOwnership<{ id: string }>(contestId, async (user, supabase, contest) => {
    // Server actions accept any JSON, so check the keys at runtime too
    if (!isSettingsUpdate(updates)) {
      throw new Error('Invalid contest update');
    }

    const season = updates.super_bowl_season ?? null;
    if (season !== null && (season !== SUPER_BOWL_SEASON || contest.sport_type !== 'football')) {
      throw new Error('Invalid contest update');
    }
    // A contest can't join once it's completed or the final is in. It can always leave.
    if (
      season !== null &&
      season !== contest.super_bowl_season &&
      (contest.status === ContestStatus.COMPLETED || !(await isSeasonOpen()))
    ) {
      throw new Error('Invalid contest update');
    }

    if (
      hasGameStarted(contest.status) &&
      LOCKED_AFTER_START.some((key) => updates[key] !== undefined && updates[key] !== contest[key])
    ) {
      throw new ValidationError(ContestErrors.RULES_LOCKED);
    }

    // Update contest (RLS ensures only owner can update)
    const { data, error } = await supabase
      .from('contests')
      .update(updates)
      .eq('id', contestId)
      .eq('owner_id', user.id)
      .select('id')
      .single();

    if (error) {
      // Raised by the database trigger when the game started in between
      if (error.message.includes('contest_rules_locked')) {
        throw new ValidationError(ContestErrors.RULES_LOCKED);
      }
      // Hit-a-thon pitches (enforce_contest_kind_rules trigger)
      if (error.message.includes('pitches_locked')) {
        throw new ValidationError(HitAThonErrors.PITCHES_LOCKED);
      }
      if (error.message.includes('pitches_below_hits')) {
        const { data: player } = await supabase
          .from('hit_players')
          .select('first_name, hits')
          .eq('contest_id', contestId)
          .gt('hits', updates.pitches_per_player ?? 0)
          .order('hits', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (player?.hits != null) {
          throw new ValidationError(PITCHES_BELOW_HITS(player.first_name, player.hits));
        }
      }
      throw new Error('Failed to update contest');
    }

    return { id: data.id };
  })();
}
