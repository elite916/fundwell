'use server';

import { PaymentStatus, PaymentStatusType } from '@/features/contests/constants';
import { ContestErrors } from '@/features/contests/constants/error-messages';
import { ActionResponse } from '@/types/action-response';
import { getCurrentISOString } from '@/utils/date-formatters';

import { withContestOwnership } from '../middleware/auth-middleware';

interface BulkUpdateSquaresInput {
  contestId: string;
  squareIds: string[];
  newStatus: PaymentStatusType;
}

export async function bulkUpdateSquares({
  contestId,
  squareIds,
  newStatus,
}: BulkUpdateSquaresInput): Promise<ActionResponse<{ updated: number }>> {
  return withContestOwnership<{ updated: number }>(contestId, async (user, supabase, contest) => {
    if (squareIds.length === 0) {
      throw new Error(ContestErrors.NO_SQUARES_SELECTED);
    }

    // Build update data based on new status
    const updateData: {
      payment_status: PaymentStatusType;
      paid_at?: string | null;
      claimant_first_name?: null;
      claimant_last_name?: null;
      claimed_at?: null;
      referred_by?: null;
    } = {
      payment_status: newStatus,
    };

    // Set paid_at timestamp when marking as paid
    if (newStatus === PaymentStatus.PAID) {
      updateData.paid_at = getCurrentISOString();
    } else if (newStatus === PaymentStatus.PENDING) {
      updateData.paid_at = null;
    } else if (newStatus === PaymentStatus.AVAILABLE) {
      // Releasing squares clears the claimant, same as a single release
      updateData.paid_at = null;
      updateData.claimant_first_name = null;
      updateData.claimant_last_name = null;
      updateData.claimed_at = null;
      updateData.referred_by = null;
    }

    // Update all squares in one query
    const { error: updateError, count } = await supabase
      .from('squares')
      .update(updateData)
      .eq('contest_id', contestId)
      .in('id', squareIds);

    if (updateError) {
      throw new Error(ContestErrors.FAILED_TO_UPDATE);
    }

    if (newStatus === PaymentStatus.AVAILABLE) {
      const { error: deleteError } = await supabase
        .from('square_claimants')
        .delete()
        .eq('contest_id', contestId)
        .in('square_id', squareIds);

      if (deleteError) {
        throw new Error(ContestErrors.FAILED_TO_UPDATE);
      }
    }

    return { updated: count ?? squareIds.length };
  })();
}
