'use server';

import type { Database } from '@/libs/supabase/types';
import type { ActionResponse } from '@/types/action-response';

import { withContestOwnership } from '../middleware/auth-middleware';

type PledgeStatus = Database['public']['Enums']['pledge_status'];

/**
 * Marks a hit-a-thon pledge paid or pending, or cancels it, as the owner. The database allows only pending → paid,
 * paid → pending, and pledged or pending → cancelled, and sets paid_at and cancelled_at. Sends no email (pledge
 * emails come in a later release).
 */
export async function updatePledgeStatus(
  contestId: string,
  pledgeId: string,
  newStatus: Extract<PledgeStatus, 'paid' | 'pending' | 'cancelled'>
): Promise<ActionResponse<{ id: string }>> {
  return withContestOwnership<{ id: string }>(contestId, async (_user, supabase, contest) => {
    if (
      contest.kind !== 'hit_a_thon' ||
      typeof pledgeId !== 'string' ||
      !['paid', 'pending', 'cancelled'].includes(newStatus)
    ) {
      throw new Error('Invalid pledge');
    }

    const { data, error } = await supabase
      .from('pledges')
      .update({ status: newStatus })
      .eq('contest_id', contestId)
      .eq('id', pledgeId)
      .select('id');

    if (error) throw error;
    if (!data.length) {
      throw new Error('Pledge not found');
    }

    return { id: data[0].id };
  })();
}

/** Marks the selected pledges paid. Only pending ones change (a per-hit pledge isn't owed until the lock). */
export async function bulkMarkPledgesPaid(
  contestId: string,
  pledgeIds: string[]
): Promise<ActionResponse<{ updated: number }>> {
  return withContestOwnership<{ updated: number }>(contestId, async (_user, supabase, contest) => {
    if (contest.kind !== 'hit_a_thon' || !Array.isArray(pledgeIds) || pledgeIds.length === 0) {
      throw new Error('Invalid pledges');
    }

    const { data, error } = await supabase
      .from('pledges')
      .update({ status: 'paid' })
      .eq('contest_id', contestId)
      .eq('status', 'pending')
      .in('id', pledgeIds)
      .select('id');

    if (error) throw error;

    return { updated: data.length };
  })();
}
