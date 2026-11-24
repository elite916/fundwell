'use server';

import { CONTEST_LIMIT_MESSAGE } from '@/features/contests/constants';
import { isAllowedStatusTransition } from '@/features/contests/constants/status-transitions';
import { ValidationError, withContestOwnership } from '@/features/contests/middleware/auth-middleware';
import { Database, Tables } from '@/libs/supabase/types';
import { ActionResponse } from '@/types/action-response';

type ContestStatus = Database['public']['Enums']['contest_status'];

/**
 * Changes a contest's status. The only status path: the dashboard button and
 * the settings status section both call it.
 */
export async function updateContestStatus(
  contestId: string,
  targetStatus: ContestStatus
): Promise<ActionResponse<Tables<'contests'>>> {
  return withContestOwnership<Tables<'contests'>>(contestId, async (user, supabase, contest) => {
    const refused = `Cannot change contest status from ${contest.status} to ${targetStatus}`;

    if (!isAllowedStatusTransition(contest.status, targetStatus)) {
      throw new ValidationError(refused);
    }

    // Validate transition requirements
    if (targetStatus === 'open') {
      // Check if unlocking from locked - scores must not exist
      if (contest.status === 'locked') {
        const { count: scoresCount } = await supabase
          .from('scores')
          .select('*', { count: 'exact', head: true })
          .eq('contest_id', contestId);

        if (scoresCount && scoresCount > 0) {
          throw new ValidationError('Cannot unlock contest after scores have been entered');
        }
      }

      // Opening from draft - payment options required
      const { count } = await supabase
        .from('payment_options')
        .select('*', { count: 'exact', head: true })
        .eq('contest_id', contestId);

      if (!count || count === 0) {
        throw new ValidationError('Please add payment options before opening the contest');
      }
    }

    if (targetStatus === 'in_progress') {
      if (!contest.row_numbers || !contest.col_numbers) {
        throw new ValidationError('Please enter numbers before starting the game');
      }
    }

    // Build update data - set is_public when opening contest
    const updateData: { status: ContestStatus; is_public?: boolean } = {
      status: targetStatus,
    };

    // Make contest publicly readable when opening (required for RLS to allow anonymous reads)
    // Note: is_public = true allows the page to load; the PIN (contest_pins) provides additional security
    if (targetStatus === 'open') {
      updateData.is_public = true;
    }

    // Update contest status
    const { data: updatedContest, error: updateError } = await supabase
      .from('contests')
      .update(updateData)
      .eq('id', contestId)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (updateError) {
      // Raised by the database triggers (enforce_contest_rules migration)
      if (updateError.message.includes('invalid_status_transition')) {
        throw new ValidationError(refused);
      }
      if (updateError.message.includes('contest_limit_reached')) {
        throw new ValidationError(CONTEST_LIMIT_MESSAGE);
      }
      throw updateError;
    }

    return updatedContest;
  })();
}
