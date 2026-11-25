'use server';

import type { ContestUpdate } from '@/features/contests/types';
import type { ActionResponse } from '@/types/action-response';

import { withContestOwnership } from '../middleware/auth-middleware';

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

/**
 * Updates a contest. Only the owner can update their contest.
 */
export async function updateContest(
  contestId: string,
  updates: ContestSettingsUpdate
): Promise<ActionResponse<{ id: string }>> {
  return withContestOwnership<{ id: string }>(contestId, async (user, supabase) => {
    // Server actions accept any JSON, so check the keys at runtime too
    if (!isSettingsUpdate(updates)) {
      throw new Error('Invalid contest update');
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
