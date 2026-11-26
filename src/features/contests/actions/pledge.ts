'use server';

import { z } from 'zod';

import { ContestStatus } from '@/features/contests/constants';
import { HitAThonErrors } from '@/features/contests/constants/error-messages';
import { getContestPin } from '@/features/contests/queries/get-contest';
import { pledgeSchema } from '@/features/contests/validation/schemas';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { ActionResponse } from '@/types/action-response';
import { sanitizeEmail } from '@/utils/email-validator';
import { logger } from '@/utils/logger';

import { hasContestAccess } from '../access';
import { isPledgeWithinLimits, undoContestPledgeHit } from '../pledge-rate-limit';

interface PledgeInput {
  contestId: string;
  playerId: string;
  kind: 'per_hit' | 'flat';
  amount: number;
  /** Per hit only. */
  cap?: number;
  firstName: string;
  lastName: string;
  email: string;
}

const notTaking = { data: null, error: { message: HitAThonErrors.NOT_TAKING_PLEDGES } };

/**
 * Pledges to one player of a hit-a-thon. Supporters aren't signed in, so the pledge is made on the server through the
 * `create_pledge` database function (service role only). It checks the hit-a-thon is open and the player is in it,
 * then saves the pledge and the supporter's contact details (owner-only `pledge_contacts`) in one transaction.
 * Sends no email (pledge emails come in a later release).
 */
export async function pledge(input: PledgeInput): Promise<ActionResponse<{ pledge: { id: string } }>> {
  const { contestId, playerId } = input;

  // Validate and sanitize email
  const sanitizedEmail = sanitizeEmail(input.email ?? '');
  if (!sanitizedEmail) {
    return {
      data: null,
      error: { message: 'Invalid email address format' },
    };
  }

  // Same rules as the pledge form. A cap is for per-hit pledges only.
  const parsed = pledgeSchema.safeParse({
    kind: input.kind,
    amount: input.amount,
    cap: input.kind === 'per_hit' ? (input.cap ?? undefined) : undefined,
    firstName: input.firstName?.trim(),
    lastName: input.lastName?.trim(),
    email: sanitizedEmail,
  });
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message },
    };
  }
  const { kind, amount, cap, firstName, lastName } = parsed.data;

  // Ids that can't exist can't take a pledge
  if (!z.guid().safeParse(contestId).success || !z.guid().safeParse(playerId).success) {
    return notTaking;
  }

  // Fetch the contest for the PIN check
  const { data: contest, error: contestError } = await supabaseAdminClient
    .from('contests')
    .select('id, slug, kind, status, hits_locked_at')
    .eq('id', contestId)
    .is('deleted_at', null)
    .single();

  if (contestError || !contest) {
    // No such contest (PGRST116) isn't worth a Sentry event
    if (contestError?.code !== 'PGRST116') {
      logger.error('pledge', contestError, { contestId });
    }
    return notTaking;
  }

  if (contest.kind !== 'hit_a_thon' || contest.status !== ContestStatus.OPEN || contest.hits_locked_at) {
    return notTaking;
  }

  // A PIN-protected hit-a-thon only takes pledges after the PIN was entered
  const accessPin = await getContestPin(contest.slug);
  if (!(await hasContestAccess(contest.slug, accessPin))) {
    return notTaking;
  }

  // Per IP, per email and per hit-a-thon
  if (!(await isPledgeWithinLimits(contestId, sanitizedEmail))) {
    return {
      data: null,
      error: { message: 'Too many requests. Please wait a moment and try again.' },
    };
  }

  const { data: made, error: pledgeError } = await supabaseAdminClient
    .rpc('create_pledge', {
      p_contest_id: contestId,
      p_player_id: playerId,
      p_kind: kind,
      p_amount: amount,
      // The SQL function accepts null for this; generated types mark every numeric arg as number.
      p_cap: (cap ?? null) as number,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: sanitizedEmail,
    })
    .single();

  if (pledgeError || !made) {
    await undoContestPledgeHit(contestId);
    const reason = pledgeError?.message ?? '';
    if (reason.includes('invalid_amount')) {
      return { data: null, error: { message: HitAThonErrors.AMOUNT_RANGE } };
    }
    if (reason.includes('invalid_cap')) {
      return {
        data: null,
        error: { message: (cap ?? 0) > 10000 ? HitAThonErrors.CAP_MAX : HitAThonErrors.CAP_BELOW_AMOUNT },
      };
    }
    if (
      ['contest_not_found', 'not_a_hit_a_thon', 'not_accepting_pledges', 'player_not_found'].some((name) =>
        reason.includes(name)
      )
    ) {
      return notTaking;
    }
    logger.error('pledge', pledgeError, { contestId, playerId });
    return { data: null, error: { message: 'An unexpected error occurred. Please try again.' } };
  }

  return {
    data: { pledge: { id: made.id } },
    error: null,
  };
}
