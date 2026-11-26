'use server';

import { after } from 'next/server';

import { PaymentStatus, PaymentStatusType } from '@/features/contests/constants';
import { ContestErrors } from '@/features/contests/constants/error-messages';
import { sendEmailSafe } from '@/features/emails/send-email-safe';
import { paymentConfirmedEmail } from '@/features/emails/templates/payment-confirmed-email';
import { Database } from '@/libs/supabase/types';
import { ActionResponse } from '@/types/action-response';
import { getCurrentISOString } from '@/utils/date-formatters';
import { getURL } from '@/utils/get-url';

import { NotFoundError, ValidationError, withContestOwnership } from '../middleware/auth-middleware';
import { getSquareChangeRefusal, getSquareChangeRefusalFromDb } from '../utils/square-rules';

interface UpdateSquareStatusInput {
  squareId: string;
  contestId: string;
  newStatus: PaymentStatusType;
}

/**
 * Updates the payment status of a square.
 * Only contest owners can update square status.
 * When setting to 'available', clears all claimant info.
 * When setting to 'paid', sets paid_at timestamp.
 */
export async function updateSquareStatus(
  input: UpdateSquareStatusInput
): Promise<ActionResponse<{ success: boolean }>> {
  const { squareId, contestId, newStatus } = input;

  // Validate required fields
  if (!squareId || !contestId || !newStatus) {
    return {
      data: null,
      error: { message: ContestErrors.ALL_FIELDS_REQUIRED },
    };
  }

  // Validate status value
  const validStatuses: PaymentStatusType[] = [PaymentStatus.AVAILABLE, PaymentStatus.PENDING, PaymentStatus.PAID];
  if (!validStatuses.includes(newStatus)) {
    return {
      data: null,
      error: { message: ContestErrors.INVALID_STATUS },
    };
  }

  return withContestOwnership<{ success: boolean }>(contestId, async (user, supabase, contest) => {
    // Verify square belongs to contest
    const { data: square, error: squareError } = await supabase
      .from('squares')
      .select('id, contest_id, payment_status, claimant_first_name, row_index, col_index, square_claimants(email)')
      .eq('id', squareId)
      .eq('contest_id', contestId)
      .single();

    if (squareError || !square) {
      throw new NotFoundError(ContestErrors.SQUARE_NOT_FOUND);
    }

    const refusal = getSquareChangeRefusal(contest.status, [square.payment_status], newStatus);
    if (refusal) {
      throw new ValidationError(refusal);
    }

    const claimantEmail = square.square_claimants?.email ?? null;

    // Build update data based on new status
    type SquareUpdate = Database['public']['Tables']['squares']['Update'];
    let updateData: SquareUpdate = {
      payment_status: newStatus,
    };

    if (newStatus === PaymentStatus.AVAILABLE) {
      // Clear all claimant info when releasing square (contact details are
      // deleted from square_claimants below)
      updateData = {
        ...updateData,
        claimant_first_name: null,
        claimant_last_name: null,
        claimed_at: null,
        paid_at: null,
        referred_by: null,
      };
    } else if (newStatus === PaymentStatus.PAID) {
      // Set paid_at timestamp when marking as paid
      updateData = {
        ...updateData,
        paid_at: getCurrentISOString(),
      };
    } else if (newStatus === PaymentStatus.PENDING) {
      // Clear paid_at when reverting to pending
      updateData = {
        ...updateData,
        paid_at: null,
      };
    }

    // Update the square. Marking an already-paid square paid changes nothing, so it sends no email.
    let updateQuery = supabase.from('squares').update(updateData).eq('id', squareId).eq('contest_id', contestId);
    if (newStatus === PaymentStatus.PAID) {
      updateQuery = updateQuery.neq('payment_status', PaymentStatus.PAID);
    }
    const { data: updatedRows, error: updateError } = await updateQuery.select('id');

    if (updateError) {
      const dbRefusal = getSquareChangeRefusalFromDb(updateError.message);
      if (dbRefusal) {
        throw new ValidationError(dbRefusal);
      }
      throw new NotFoundError(ContestErrors.SQUARE_NOT_FOUND);
    }

    if (newStatus === PaymentStatus.AVAILABLE) {
      const { error: deleteError } = await supabase.from('square_claimants').delete().eq('square_id', squareId);

      if (deleteError) {
        throw new Error(ContestErrors.FAILED_TO_UPDATE);
      }
    }

    // Send confirmation email after the response when marking as paid (don't block on failure)
    if (newStatus === PaymentStatus.PAID && claimantEmail && updatedRows.length > 0) {
      const contestUrl = `${getURL()}/contest/${contest.slug}`;

      after(() =>
        sendEmailSafe({
          to: claimantEmail,
          template: paymentConfirmedEmail({
            participantName: square.claimant_first_name || 'there',
            contestName: contest.name,
            rowTeamName: contest.row_team_name,
            colTeamName: contest.col_team_name,
            rowIndex: square.row_index,
            colIndex: square.col_index,
            contestUrl,
          }),
          contestId,
          squareId: square.id,
          emailType: 'payment_confirmed',
        })
      );
    }

    return { success: true };
  })();
}
