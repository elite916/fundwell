'use server';

import { after } from 'next/server';

import { HitAThonErrors, HITS_LEFT } from '@/features/contests/constants';
import {
  drainHitAThonEmails,
  enqueueLockEmails,
  enqueueMissingLockEmails,
  enqueueReminders,
  LONG_DRAIN_MS,
} from '@/features/emails/hit-a-thon-emails';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import type { ActionResponse } from '@/types/action-response';
import { logger } from '@/utils/logger';

import { ValidationError, withContestOwnership } from '../middleware/auth-middleware';

/**
 * "Lock and Send Totals": the owner's check, then `lock_hit_a_thon` (service role only), which works out every
 * per-hit pledge, locks the hits, closes pledges and starts the event in one transaction. Then the total emails
 * and the organizer's are queued and sent after the response. Locking again (a second tab, a lost response) sends
 * nothing new.
 */
export async function lockHitAThon(contestId: string): Promise<ActionResponse<{ locked: true }>> {
  return withContestOwnership<{ locked: true }>(contestId, async (_user, _supabase, contest) => {
    if (contest.kind !== 'hit_a_thon') {
      throw new Error('Not a hit-a-thon');
    }

    const { error } = await supabaseAdminClient.rpc('lock_hit_a_thon', { p_contest_id: contestId });

    if (error && !error.message.includes('already_locked')) {
      if (error.message.includes('hits_missing')) {
        throw new ValidationError(HITS_LEFT(Number(error.details) || 1));
      }
      if (error.message.includes('payment_option_required')) {
        throw new ValidationError(HitAThonErrors.PAYMENT_OPTION_FIRST);
      }
      throw error;
    }

    // The hits are locked whatever happens here; a dashboard load queues what's missing. Locked already (a second
    // tab, a lost response): only what that lock didn't get to queue.
    try {
      if (error) await enqueueMissingLockEmails(contestId, contest.owner_id);
      else await enqueueLockEmails(contestId, contest.owner_id);
    } catch (queueError) {
      logger.error('lockHitAThon', queueError, { contestId });
    }
    after(() => drainHitAThonEmails(contestId, LONG_DRAIN_MS));

    return { locked: true };
  })();
}

/** "Email Unpaid Supporters": a reminder to every pledge still owed, at most once a day each. After the lock only. */
export async function emailUnpaidSupporters(contestId: string): Promise<ActionResponse<{ owed: number }>> {
  return withContestOwnership<{ owed: number }>(contestId, async (_user, _supabase, contest) => {
    if (contest.kind !== 'hit_a_thon' || !contest.hits_locked_at) {
      throw new Error('Hits are not locked');
    }

    const owed = await enqueueReminders(contestId);
    after(() => drainHitAThonEmails(contestId, LONG_DRAIN_MS));

    return { owed };
  })();
}
