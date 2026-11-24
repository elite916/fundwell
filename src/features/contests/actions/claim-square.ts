'use server';

import { after } from 'next/server';
import { z } from 'zod';

import { ContestStatus } from '@/features/contests/constants';
import { ContestErrors, MAX_SQUARES_REACHED } from '@/features/contests/constants/error-messages';
import { getContestPin } from '@/features/contests/queries/get-contest';
import { getPaymentOptionsForContest } from '@/features/contests/queries/get-payment-options';
import { playerSchema } from '@/features/contests/types/player';
import { claimSquareSchema } from '@/features/contests/validation/schemas';
import { sendEmailSafe } from '@/features/emails/send-email-safe';
import { squareClaimedEmail } from '@/features/emails/templates/square-claimed-email';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { ActionResponse } from '@/types/action-response';
import { sanitizeEmail } from '@/utils/email-validator';
import { getURL } from '@/utils/get-url';
import { logger } from '@/utils/logger';
import { checkRateLimit } from '@/utils/rate-limit';

import { hasContestAccess } from '../access';

interface ClaimSquareInput {
  squareId: string;
  contestId: string;
  firstName: string;
  lastName: string;
  email: string;
  venmoHandle?: string;
  referredBySlug?: string;
}

/**
 * Claims a square for a participant.
 * Participants aren't signed in, so the claim runs on the server through the
 * `claim_square` database function (service role only). It checks the contest
 * is open, the per-person limit and that the square is still free, in one
 * transaction. Contact details go to the owner-only `square_claimants` table.
 */
export async function claimSquare(
  input: ClaimSquareInput
): Promise<ActionResponse<{ square: { id: string; row_index: number; col_index: number } }>> {
  const { squareId, contestId, referredBySlug } = input;

  // Validate and sanitize email
  const sanitizedEmail = sanitizeEmail(input.email);
  if (!sanitizedEmail) {
    return {
      data: null,
      error: { message: 'Invalid email address format' },
    };
  }

  // Rate limit check
  const rateLimit = await checkRateLimit(`claim:${sanitizedEmail}`, { maxRequests: 10, windowMs: 60000 });
  if (!rateLimit.success) {
    return {
      data: null,
      error: { message: 'Too many requests. Please wait a moment and try again.' },
    };
  }

  // Validate required fields and lengths (same rules as the claim form)
  const parsed = claimSquareSchema.safeParse({
    firstName: input.firstName?.trim(),
    lastName: input.lastName?.trim(),
    email: sanitizedEmail,
    venmoHandle: input.venmoHandle?.trim() || undefined,
    referredBySlug: referredBySlug || undefined,
  });
  if (!squareId || !contestId || !parsed.success) {
    return {
      data: null,
      error: { message: parsed.success ? ContestErrors.ALL_FIELDS_REQUIRED : parsed.error.issues[0].message },
    };
  }
  const { firstName, lastName, venmoHandle } = parsed.data;

  // Fetch contest for the PIN check, referral names and the email
  const { data: contest, error: contestError } = await supabaseAdminClient
    .from('contests')
    .select('id, status, name, slug, row_team_name, col_team_name, square_price, players')
    .eq('id', contestId)
    .is('deleted_at', null)
    .single();

  if (contestError || !contest) {
    logger.error('claimSquare', contestError, { contestId, squareId });
    return {
      data: null,
      error: { message: ContestErrors.NOT_FOUND },
    };
  }

  if (contest.status !== ContestStatus.OPEN) {
    return {
      data: null,
      error: { message: ContestErrors.NOT_OPEN },
    };
  }

  // A PIN-protected contest can only be claimed after the PIN was entered
  const accessPin = await getContestPin(contest.slug);
  if (!(await hasContestAccess(contest.slug, accessPin))) {
    return {
      data: null,
      error: { message: ContestErrors.NOT_FOUND },
    };
  }

  // Resolve referredBy from slug if provided
  let referredBy: string | null = null;
  if (referredBySlug && contest.players) {
    const playersResult = z.array(playerSchema).safeParse(contest.players);
    if (playersResult.success) {
      const matchedPlayer = playersResult.data.find((p) => p.slug.toLowerCase() === referredBySlug.toLowerCase());
      if (matchedPlayer) {
        referredBy = matchedPlayer.name;
      }
    } else {
      logger.error('claimSquare', new Error('Invalid players JSONB format'), {
        contestId,
        parseError: playersResult.error.message,
      });
    }
  }

  const { data: claimed, error: claimError } = await supabaseAdminClient
    .rpc('claim_square', {
      p_contest_id: contestId,
      p_square_id: squareId,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: sanitizedEmail,
      // The SQL function accepts null for these; generated types mark every text arg as string.
      p_venmo: (venmoHandle ?? null) as string,
      p_referred_by: referredBy as string,
    })
    .single();

  if (claimError || !claimed) {
    const reason = claimError?.message ?? '';
    if (reason.includes('square_taken')) {
      return { data: null, error: { message: ContestErrors.RACE_CONDITION } };
    }
    if (reason.includes('max_squares_reached')) {
      const { data: limit } = await supabaseAdminClient
        .from('contests')
        .select('max_squares_per_person')
        .eq('id', contestId)
        .single();
      return { data: null, error: { message: MAX_SQUARES_REACHED(limit?.max_squares_per_person ?? 0) } };
    }
    if (reason.includes('contest_not_open')) {
      return { data: null, error: { message: ContestErrors.NOT_OPEN } };
    }
    logger.error('claimSquare', claimError, { contestId, squareId });
    return { data: null, error: { message: ContestErrors.FAILED_TO_CLAIM } };
  }

  // Send confirmation email after the response (don't block on failure)
  const paymentOptions = await getPaymentOptionsForContest(contestId);
  const contestUrl = `${getURL()}/contest/${contest.slug}`;

  after(() =>
    sendEmailSafe({
      to: sanitizedEmail,
      template: squareClaimedEmail({
        participantName: firstName,
        contestName: contest.name,
        rowTeamName: contest.row_team_name,
        colTeamName: contest.col_team_name,
        rowIndex: claimed.row_index,
        colIndex: claimed.col_index,
        squarePrice: contest.square_price,
        contestUrl,
        paymentOptions: paymentOptions.map((opt) => ({
          type: opt.type,
          handle: opt.handle_or_link,
          link: opt.handle_or_link.startsWith('http') ? opt.handle_or_link : undefined,
        })),
      }),
      contestId,
      squareId: claimed.id,
      emailType: 'square_claimed',
    })
  );

  return {
    data: {
      square: {
        id: claimed.id,
        row_index: claimed.row_index,
        col_index: claimed.col_index,
      },
    },
    error: null,
  };
}
