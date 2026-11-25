import { ContestStatus, PaymentStatus, QuarterDisplayNames } from '@/features/contests/constants';
import type { GameQuarter } from '@/features/contests/types';
import { calculatePrizeAmount, countSoldSquares, getPrizeText } from '@/features/contests/utils/prize-helpers';
import { SUPER_BOWL_QUARTERS } from '@/features/super-bowl/constants';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import type { Tables } from '@/libs/supabase/types';
import { getCurrentISOString } from '@/utils/date-formatters';
import { getURL } from '@/utils/get-url';
import { logger } from '@/utils/logger';

import { organizerQuarterEmail } from './templates/organizer-quarter-email';
import { organizerSummaryEmail } from './templates/organizer-summary-email';
import { winnerEmail } from './templates/winner-email';
import { sendEmail } from './send-email';

import 'server-only';

const STUCK_AFTER_MS = 10 * 60 * 1000;
const SEND_TIMEOUT_MS = 15 * 1000;
const SEND_GAP_MS = 500;
const RATE_LIMIT_WAIT_MS = 2000;

const CLOSES_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

type QueuedEmail = Pick<
  Tables<'email_logs'>,
  'id' | 'contest_id' | 'square_id' | 'recipient_email' | 'email_type' | 'status' | 'dedupe_key'
>;
type EmailContent = { subject: string; html: string };
type Outcome = 'sent' | 'failed' | 'rate_limited' | 'unconfirmed';

/**
 * Writes each queued email from current data. Null means it's out of date and must not go out.
 * The drain only picks up the types listed here, and sends them in this order.
 */
const emailBuilders: Record<string, (email: QueuedEmail) => Promise<EmailContent | null>> = {
  winner_notification: buildWinnerEmail,
  organizer_quarter: buildOrganizerQuarterEmail,
  organizer_summary: buildOrganizerSummaryEmail,
};
const EMAIL_TYPES = Object.keys(emailBuilders);

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
    await enqueue({
      contest_id: contestId,
      square_id: squareId,
      recipient_email: recipientEmail,
      email_type: 'winner_notification',
      dedupe_key: `winner:${quarter}:${winnerRev}`,
    });
  } catch (error) {
    logger.error('enqueueWinnerEmail', error, { contestId, quarter });
  }
}

interface OrganizerEmailsParams {
  contestId: string;
  ownerId: string;
  scores: { quarter: GameQuarter; winner_rev: number }[];
}

/** Queues an email to the organizer for each score, once per winner of a quarter. Never throws. */
export async function enqueueOrganizerQuarterEmails({
  contestId,
  ownerId,
  scores,
}: OrganizerEmailsParams): Promise<void> {
  try {
    if (scores.length === 0) return;

    const recipientEmail = await getAccountEmail(ownerId);
    for (const score of scores) {
      await enqueue({
        contest_id: contestId,
        recipient_email: recipientEmail,
        email_type: 'organizer_quarter',
        dedupe_key: `organizer:${score.quarter}:${score.winner_rev}`,
      });
    }
  } catch (error) {
    logger.error('enqueueOrganizerQuarterEmails', error, { contestId });
  }
}

/** Queues the organizer's summary when all four scores are in, once per set of winners. Never throws. */
export async function enqueueOrganizerSummaryEmail(contestId: string, ownerId: string): Promise<void> {
  try {
    const summaryRev = getSummaryRev(await loadScores(contestId));
    if (summaryRev === null) return;

    await enqueue({
      contest_id: contestId,
      recipient_email: await getAccountEmail(ownerId),
      email_type: 'organizer_summary',
      dedupe_key: `summary:${summaryRev}`,
    });
  } catch (error) {
    logger.error('enqueueOrganizerSummaryEmail', error, { contestId });
  }
}

/** Does nothing when the contest already has this key. */
async function enqueue(
  email: Pick<QueuedEmail, 'contest_id' | 'recipient_email' | 'email_type' | 'dedupe_key'> & { square_id?: string }
): Promise<void> {
  const { error } = await supabaseAdminClient
    .from('email_logs')
    .upsert({ ...email, status: 'queued' }, { onConflict: 'contest_id,dedupe_key', ignoreDuplicates: true });
  throwIfError(error);
}

async function getAccountEmail(userId: string): Promise<string> {
  const { data, error } = await supabaseAdminClient.auth.admin.getUserById(userId);
  if (error || !data.user.email) throw new Error(`No account email: ${error?.code}`);
  return data.user.email;
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
      .in('email_type', EMAIL_TYPES)
      .not('dedupe_key', 'is', null)
      .order('sent_at');
    throwIfError(emailsError);

    // A retried email has a newer time, so the types are put in order here
    emails?.sort((a, b) => EMAIL_TYPES.indexOf(a.email_type) - EMAIL_TYPES.indexOf(b.email_type));

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
  const score = await loadKeyedScore(email, 'winner');
  if (!score) return null;

  const contestData = await loadContestData(email.contest_id);
  const { contest, squares } = contestData;
  const winningSquare = squares.find((sq) => sq.id === score.winning_square_id);

  return winnerEmail({
    participantName: winningSquare?.claimant_first_name || 'Winner',
    contestName: contest.name,
    quarterName: QuarterDisplayNames[score.quarter] || score.quarter,
    homeTeamName: contest.row_team_name,
    awayTeamName: contest.col_team_name,
    homeScore: score.home_score,
    awayScore: score.away_score,
    ...getPrize(contestData, score.quarter),
    contestUrl: `${getURL()}/contest/${contest.slug}`,
  });
}

async function buildOrganizerQuarterEmail(email: QueuedEmail): Promise<EmailContent | null> {
  const score = await loadKeyedScore(email, 'organizer');
  if (!score) return null;

  const contestData = await loadContestData(email.contest_id);
  const { contest } = contestData;

  return organizerQuarterEmail({
    contestName: contest.name,
    isCorrected: score.winner_rev > 1,
    ...getQuarterResult(contestData, score),
    contestUrl: `${getURL()}/dashboard/${contest.id}`,
  });
}

async function buildOrganizerSummaryEmail(email: QueuedEmail): Promise<EmailContent | null> {
  const scores = await loadScores(email.contest_id);
  if (email.dedupe_key !== `summary:${getSummaryRev(scores)}`) return null;

  const contestData = await loadContestData(email.contest_id);
  const { contest } = contestData;

  const { count: earlierCount, error } = await supabaseAdminClient
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('contest_id', email.contest_id)
    .eq('email_type', email.email_type)
    .neq('id', email.id)
    .in('status', ['sending', 'sent', 'unconfirmed']);
  throwIfError(error);

  return organizerSummaryEmail({
    contestName: contest.name,
    isCorrected: !!earlierCount,
    quarters: SUPER_BOWL_QUARTERS.flatMap((quarter) =>
      scores.filter((score) => score.quarter === quarter).map((score) => getQuarterResult(contestData, score))
    ),
    isCompleted: contest.status === ContestStatus.COMPLETED,
    closesAt: await getClosingTime(contest),
    contestUrl: `${getURL()}/dashboard/${contest.id}`,
  });
}

async function loadScores(contestId: string) {
  const { data, error } = await supabaseAdminClient
    .from('scores')
    .select('quarter, home_score, away_score, winning_square_id, winner_rev')
    .eq('contest_id', contestId);
  throwIfError(error);
  return data ?? [];
}

type LoadedScore = Awaited<ReturnType<typeof loadScores>>[number];

/** The score a "prefix:quarter:revision" key is about. Null when its winner has changed since, or it's gone. */
async function loadKeyedScore(email: QueuedEmail, prefix: string): Promise<LoadedScore | null> {
  const [keyPrefix, quarter, winnerRev] = email.dedupe_key?.match(/^(\w+):(q1|q2|q3|final):(\d+)$/)?.slice(1) ?? [];
  if (keyPrefix !== prefix) return null;

  const scores = await loadScores(email.contest_id);
  return scores.find((score) => score.quarter === quarter && score.winner_rev === Number(winnerRev)) ?? null;
}

/** Changes when any winner does. Null until all four scores are in. */
function getSummaryRev(scores: LoadedScore[]): number | null {
  const gameScores = scores.filter(({ quarter }) => (SUPER_BOWL_QUARTERS as readonly string[]).includes(quarter));
  if (gameScores.length < SUPER_BOWL_QUARTERS.length) return null;
  return gameScores.reduce((sum, { winner_rev }) => sum + winner_rev, 0);
}

async function loadContestData(contestId: string) {
  const { data: contest, error: contestError } = await supabaseAdminClient
    .from('contests')
    .select('*')
    .eq('id', contestId)
    .single();
  throwIfError(contestError);

  const { data: squares, error: squaresError } = await supabaseAdminClient
    .from('squares')
    .select('id, payment_status, claimant_first_name, claimant_last_name, square_claimants(email, venmo)')
    .eq('contest_id', contestId);
  throwIfError(squaresError);

  if (!contest || !squares) throw new Error('No contest data for the email');
  return { contest, squares };
}

type ContestData = Awaited<ReturnType<typeof loadContestData>>;

/** Prize amount based on squares sold and payout percentage */
function getPrize({ contest, squares }: ContestData, quarter: GameQuarter) {
  return {
    prizeAmount: calculatePrizeAmount(
      countSoldSquares(squares),
      contest.square_price,
      contest[`payout_${quarter}_percent`] || 0
    ),
    prizeText: getPrizeText(contest.prize_type, quarter, contest),
  };
}

/** What the organizer's emails say about a quarter. An unclaimed square can still have an old claim's contact. */
function getQuarterResult(contestData: ContestData, score: LoadedScore) {
  const { contest, squares } = contestData;
  const square = squares.find((sq) => sq.id === score.winning_square_id);
  const isClaimed = !!square && square.payment_status !== PaymentStatus.AVAILABLE;

  return {
    quarterName: QuarterDisplayNames[score.quarter] || score.quarter,
    homeTeamName: contest.row_team_name,
    awayTeamName: contest.col_team_name,
    homeScore: score.home_score,
    awayScore: score.away_score,
    winner: isClaimed
      ? {
          name: [square.claimant_first_name, square.claimant_last_name].filter(Boolean).join(' '),
          email: square.square_claimants?.email ?? null,
          venmo: square.square_claimants?.venmo ?? null,
        }
      : null,
    ...getPrize(contestData, score.quarter),
  };
}

/** When the database will close the contest (close_super_bowl_contests). Null when it won't. */
async function getClosingTime(
  contest: Pick<Tables<'contests'>, 'created_at' | 'super_bowl_season'>
): Promise<Date | null> {
  if (contest.super_bowl_season === null) return null;

  const { data: game, error } = await supabaseAdminClient
    .from('super_bowl_games')
    .select('final_at')
    .eq('season', contest.super_bowl_season)
    .maybeSingle();
  throwIfError(error);

  if (!game?.final_at || new Date(contest.created_at) >= new Date(game.final_at)) return null;
  return new Date(new Date(game.final_at).getTime() + CLOSES_AFTER_MS);
}

/** Keeps the code and message only: a database error's details can hold the row, and so an email address. */
function throwIfError(error: { code: string; message: string } | null): void {
  if (error) throw new Error(`${error.code} ${error.message}`);
}

function wait(ms: number): Promise<undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}
