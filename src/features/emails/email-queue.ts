import { QuarterDisplayNames } from '@/features/contests/constants';
import type { GameQuarter } from '@/features/contests/types';
import { calculatePrizeAmount, countSoldSquares, getPrizeText } from '@/features/contests/utils/prize-helpers';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import type { Tables } from '@/libs/supabase/types';
import { getCurrentISOString } from '@/utils/date-formatters';
import { getURL } from '@/utils/get-url';
import { logger } from '@/utils/logger';

import { winnerEmail } from './templates/winner-email';
import { sendEmail } from './send-email';

import 'server-only';

const STUCK_AFTER_MS = 10 * 60 * 1000;
const SEND_TIMEOUT_MS = 15 * 1000;
const SEND_GAP_MS = 500;
const RATE_LIMIT_WAIT_MS = 2000;

type QueuedEmail = Pick<
  Tables<'email_logs'>,
  'id' | 'contest_id' | 'square_id' | 'recipient_email' | 'email_type' | 'status' | 'dedupe_key'
>;
type EmailContent = { subject: string; html: string };
type Outcome = 'sent' | 'failed' | 'rate_limited' | 'unconfirmed';

/**
 * Writes each queued email from current data. Null means it's out of date and must not go out.
 * The drain only picks up the types listed here.
 */
const emailBuilders: Record<string, (email: QueuedEmail) => Promise<EmailContent | null>> = {
  winner_notification: buildWinnerEmail,
};

interface WinnerEmailParams {
  contestId: string;
  quarter: GameQuarter;
  winnerRev: number;
  squareId: string;
  recipientEmail: string;
}

/** Queues a winner email, once per winner of a quarter. Never throws: the score is already saved. */
export async function enqueueWinnerEmail({
  contestId,
  quarter,
  winnerRev,
  squareId,
  recipientEmail,
}: WinnerEmailParams): Promise<void> {
  try {
    const { error } = await supabaseAdminClient.from('email_logs').upsert(
      {
        contest_id: contestId,
        square_id: squareId,
        recipient_email: recipientEmail,
        email_type: 'winner_notification',
        status: 'queued',
        dedupe_key: `winner:${quarter}:${winnerRev}`,
      },
      { onConflict: 'contest_id,dedupe_key', ignoreDuplicates: true }
    );
    throwIfError(error);
  } catch (error) {
    logger.error('enqueueWinnerEmail', error, { contestId, quarter });
  }
}

/**
 * Sends a contest's queued emails, and retries the refused ones. Safe to run twice at once:
 * each row is claimed before it's sent. Never throws. When draining contest after contest, pass on
 * `hasSent` to keep the gap between sends, and stop once one is rate limited.
 */
export async function drainEmailQueue(
  contestId: string,
  hasSent = false
): Promise<{ hasSent: boolean; isRateLimited: boolean }> {
  try {
    const { error: stuckError } = await supabaseAdminClient
      .from('email_logs')
      .update({ status: 'unconfirmed' })
      .eq('contest_id', contestId)
      .eq('status', 'sending')
      .lt('sent_at', new Date(Date.now() - STUCK_AFTER_MS).toISOString());
    throwIfError(stuckError);

    const { data: emails, error: emailsError } = await supabaseAdminClient
      .from('email_logs')
      .select('id, contest_id, square_id, recipient_email, email_type, status, dedupe_key')
      .eq('contest_id', contestId)
      .in('status', ['queued', 'failed'])
      .in('email_type', Object.keys(emailBuilders))
      .not('dedupe_key', 'is', null)
      .order('sent_at');
    throwIfError(emailsError);

    for (const email of emails ?? []) {
      if (!(await claimEmail(email))) continue;

      let content: EmailContent | null;
      try {
        content = await emailBuilders[email.email_type](email);
      } catch (error) {
        // Nothing went out, so a later drain can try again
        logger.error('drainEmailQueue', error, { contestId, emailType: email.email_type });
        await setStatus(email, { status: email.status });
        continue;
      }
      if (!content) {
        await setStatus(email, { status: 'skipped' });
        continue;
      }

      if (hasSent) await wait(SEND_GAP_MS);
      hasSent = true;

      let { outcome, resendId } = await send(email, content);
      if (outcome === 'rate_limited') {
        await wait(RATE_LIMIT_WAIT_MS);
        ({ outcome, resendId } = await send(email, content));
      }
      if (outcome === 'rate_limited') {
        await setStatus(email, { status: 'queued' });
        return { hasSent, isRateLimited: true };
      }
      await setStatus(
        email,
        outcome === 'sent'
          ? { status: outcome, resend_id: resendId, sent_at: getCurrentISOString() }
          : { status: outcome }
      );
    }
  } catch (error) {
    logger.error('drainEmailQueue', error, { contestId });
  }

  return { hasSent, isRateLimited: false };
}

/** Takes a row so that no other drain can send it. False if another one got there first. */
async function claimEmail(email: QueuedEmail): Promise<boolean> {
  const { data, error } = await supabaseAdminClient
    .from('email_logs')
    .update({ status: 'sending', sent_at: getCurrentISOString() })
    .eq('id', email.id)
    .eq('status', email.status ?? '')
    .select('id');
  throwIfError(error);
  return !!data?.length;
}

async function setStatus(
  email: QueuedEmail,
  update: Pick<Tables<'email_logs'>, 'status'> & Partial<Pick<Tables<'email_logs'>, 'resend_id' | 'sent_at'>>
): Promise<void> {
  const { error } = await supabaseAdminClient.from('email_logs').update(update).eq('id', email.id);
  throwIfError(error);
}

/** Only a refusal with a status code is known not to have gone out. Anything unclear is never sent again. */
async function send(
  email: QueuedEmail,
  { subject, html }: EmailContent
): Promise<{ outcome: Outcome; resendId: string | null }> {
  const result = await Promise.race([
    sendEmail({
      to: email.recipient_email,
      subject,
      html,
      contestId: email.contest_id,
      squareId: email.square_id ?? undefined,
      emailType: email.email_type,
    }),
    wait(SEND_TIMEOUT_MS),
  ]);

  if (result?.success) return { outcome: 'sent', resendId: result.id ?? null };

  const statusCode = result?.statusCode ?? 0;
  if (statusCode === 429) return { outcome: 'rate_limited', resendId: null };
  if (statusCode >= 400 && statusCode < 500) return { outcome: 'failed', resendId: null };
  return { outcome: 'unconfirmed', resendId: null };
}

async function buildWinnerEmail(email: QueuedEmail): Promise<EmailContent | null> {
  const [, quarterKey, winnerRev] = email.dedupe_key?.match(/^winner:(q1|q2|q3|final):(\d+)$/) ?? [];
  if (!quarterKey) return null;
  const quarter = quarterKey as GameQuarter;

  const { data: score, error: scoreError } = await supabaseAdminClient
    .from('scores')
    .select('home_score, away_score, winning_square_id, winner_rev')
    .eq('contest_id', email.contest_id)
    .eq('quarter', quarter)
    .maybeSingle();
  throwIfError(scoreError);
  if (!score || score.winner_rev !== Number(winnerRev)) return null;

  const { data: contest, error: contestError } = await supabaseAdminClient
    .from('contests')
    .select('*')
    .eq('id', email.contest_id)
    .single();
  throwIfError(contestError);

  const { data: squares, error: squaresError } = await supabaseAdminClient
    .from('squares')
    .select('id, payment_status, claimant_first_name')
    .eq('contest_id', email.contest_id);
  throwIfError(squaresError);

  if (!contest || !squares) throw new Error('No contest data for the winner email');

  const winningSquare = squares.find((sq) => sq.id === score.winning_square_id);
  // Prize amount based on squares sold and payout percentage
  const payoutPercent = contest[`payout_${quarter}_percent`] || 0;

  return winnerEmail({
    participantName: winningSquare?.claimant_first_name || 'Winner',
    contestName: contest.name,
    quarterName: QuarterDisplayNames[quarter] || quarter,
    homeTeamName: contest.row_team_name,
    awayTeamName: contest.col_team_name,
    homeScore: score.home_score,
    awayScore: score.away_score,
    prizeAmount: calculatePrizeAmount(countSoldSquares(squares), contest.square_price, payoutPercent),
    prizeText: getPrizeText(contest.prize_type, quarter, contest),
    contestUrl: `${getURL()}/contest/${contest.slug}`,
  });
}

/** Keeps the code and message only: a database error's details can hold the row, and so an email address. */
function throwIfError(error: { code: string; message: string } | null): void {
  if (error) throw new Error(`${error.code} ${error.message}`);
}

function wait(ms: number): Promise<undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}
