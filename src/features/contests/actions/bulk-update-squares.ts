'use server';

import { hasGameStarted, NO_SQUARES_CHANGED, PaymentStatus, PaymentStatusType } from '@/features/contests/constants';
import { ContestErrors } from '@/features/contests/constants/error-messages';
import { ActionResponse } from '@/types/action-response';
import { getCurrentISOString } from '@/utils/date-formatters';

import { ValidationError, withContestOwnership } from '../middleware/auth-middleware';
import { getSquareChangeRefusal, getSquareChangeRefusalFromDb } from '../utils/square-rules';

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
      throw new ValidationError(ContestErrors.NO_SQUARES_SELECTED);
    }

    // After the start, one square that isn't allowed refuses the whole action
    if (hasGameStarted(contest.status)) {
      const { data: selected, error: selectError } = await supabase
        .from('squares')
        .select('payment_status')
        .eq('contest_id', contestId)
        .in('id', squareIds);

      if (selectError) {
        throw new Error(ContestErrors.FAILED_TO_UPDATE);
      }

      const refusal = getSquareChangeRefusal(
        contest.status,
        selected.map((s) => s.payment_status),
        newStatus
      );
      if (refusal) {
        throw new ValidationError(NO_SQUARES_CHANGED(refusal));
      }
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
      const dbRefusal = getSquareChangeRefusalFromDb(updateError.message);
      if (dbRefusal) {
        throw new ValidationError(NO_SQUARES_CHANGED(dbRefusal));
      }
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
