'use server';

import { after } from 'next/server';

import { drainHitAThonEmails, enqueuePledgePaid } from '@/features/emails/hit-a-thon-emails';
import type { Database } from '@/libs/supabase/types';
import type { ActionResponse } from '@/types/action-response';

import { withContestOwnership } from '../middleware/auth-middleware';

type PledgeStatus = Database['public']['Enums']['pledge_status'];

/**
 * Marks a hit-a-thon pledge paid or pending, or cancels it, as the owner. The database allows only pending → paid,
 * paid → pending, and pledged or pending → cancelled, and sets paid_at and cancelled_at. Marking paid emails
 * "payment confirmed", once per payment (marking a paid pledge paid again keeps its paid_at, so its key).
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
      .select('id, status, paid_at');

    if (error) throw error;
    if (!data.length) {
      throw new Error('Pledge not found');
    }

    const [updated] = data;
    if (newStatus === 'paid' && updated.status === 'paid' && updated.paid_at) {
      await enqueuePledgePaid(contestId, updated.id, updated.paid_at);
      after(() => drainHitAThonEmails(contestId));
    }

    return { id: updated.id };
  })();
}

/**
 * Marks the selected pledges paid. Only pending ones change (a per-hit pledge isn't owed until the lock). Sends no
 * email, like the squares bulk "Mark as Paid".
 */
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
