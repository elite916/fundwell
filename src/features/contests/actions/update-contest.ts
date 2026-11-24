'use server';

import { ContestStatus } from '@/features/contests/constants';
import { isAllowedStatusTransition } from '@/features/contests/constants/status-transitions';
import type { Contest, ContestUpdate } from '@/features/contests/types';
import type { Database } from '@/libs/supabase/types';
import type { ActionResponse } from '@/types/action-response';
import { SupabaseClient } from '@supabase/supabase-js';

import { withContestOwnership } from '../middleware/auth-middleware';

type SupabaseDb = SupabaseClient<Database>;

// Columns the settings forms may change. Anything else is rejected.
const UPDATABLE_COLUMNS = [
  'status',
  'is_public',
  'name',
  'description',
  'row_team_name',
  'col_team_name',
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
  'is_super_bowl',
  'enable_player_tracking',
  'players',
] as const satisfies readonly (keyof ContestUpdate)[];

export type ContestSettingsUpdate = Pick<ContestUpdate, (typeof UPDATABLE_COLUMNS)[number]>;

function isSettingsUpdate(updates: unknown): updates is ContestSettingsUpdate {
  if (typeof updates !== 'object' || updates === null || Array.isArray(updates)) return false;
  return Object.keys(updates).every((key) => (UPDATABLE_COLUMNS as readonly string[]).includes(key));
}

function validateInProgressTransition(contest: Contest): string | null {
  if (!contest.row_numbers || !contest.col_numbers) {
    return 'Please enter numbers before starting the game';
  }
  return null;
}

async function validateOpenTransition(
  supabase: SupabaseDb,
  contest: Contest
): Promise<string | null> {
  // Check if unlocking from locked - scores must not exist
  if (contest.status === ContestStatus.LOCKED) {
    const { count: scoresCount } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', contest.id);

    if (scoresCount && scoresCount > 0) {
      return 'Cannot unlock contest after scores have been entered';
    }
  }

  // Opening from draft - payment options required
  const { count } = await supabase
    .from('payment_options')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', contest.id);

  if (!count || count === 0) {
    return 'Please add payment options before opening the contest';
  }

  return null;
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

    if (updates.status !== undefined && !isAllowedStatusTransition(contest.status, updates.status)) {
      throw new Error(`Cannot change contest status from ${contest.status} to ${updates.status}`);
    }

    // Validate status transitions
    if (updates.status === ContestStatus.IN_PROGRESS) {
      const validationError = validateInProgressTransition(contest);
      if (validationError) throw new Error(validationError);
    }

    if (updates.status === ContestStatus.OPEN) {
      const validationError = await validateOpenTransition(supabase, contest);
      if (validationError) throw new Error(validationError);
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
      throw new Error('Failed to update contest');
    }

    return { id: data.id };
  })();
}
