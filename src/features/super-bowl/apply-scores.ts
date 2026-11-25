import { PaymentStatus } from '@/features/contests/constants';
import { findWinningSquare } from '@/features/contests/utils/find-winning-square';
import { drainEmailQueue, enqueueWinnerEmail } from '@/features/emails/email-queue';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { getCurrentISOString } from '@/utils/date-formatters';
import { logger } from '@/utils/logger';

import { SUPER_BOWL_QUARTERS } from './constants';
import { getProblem, getRowTeam, getSeasonContests, getSuperBowlGame, type SeasonContest } from './queries';
import type { SuperBowlApplyResult, SuperBowlGame, SuperBowlQuarter, SuperBowlTeam } from './types';

import 'server-only';

interface PlannedScore {
  quarter: SuperBowlQuarter;
  home_score: number;
  away_score: number;
  winning_square_id: string | null;
}

/** Puts the game's scores on every contest of this season that can take them. Safe to repeat. */
export async function applyScores(): Promise<SuperBowlApplyResult> {
  const result: SuperBowlApplyResult = { contestsUpdated: 0, skipped: [], failed: [] };
  const game = await getSuperBowlGame();
  if (!game || !hasScores(game)) return result;

  for (const contest of await getSeasonContests()) {
    const problem = getProblem(contest, game);
    if (problem) {
      result.skipped.push({ contestId: contest.id, reason: problem });
      continue;
    }

    try {
      if (await applyToContest(contest, game)) result.contestsUpdated++;
    } catch (error) {
      logger.error('applyScores', error, { contestId: contest.id });
      result.failed.push({ contestId: contest.id, name: contest.name });
    }
  }

  return result;
}

/** What saving these scores would do. Writes nothing. */
export async function previewScores(game: SuperBowlGame): Promise<{ contests: number; winners: number }> {
  const result = { contests: 0, winners: 0 };
  if (!hasScores(game)) return result;

  for (const contest of await getSeasonContests()) {
    const rowTeam = getRowTeam(contest, game);
    if (getProblem(contest, game) || !rowTeam) continue;

    try {
      const { updated, winners } = await previewContest(contest, rowTeam, game);
      if (updated) result.contests++;
      result.winners += winners;
    } catch (error) {
      logger.error('previewScores', error, { contestId: contest.id });
    }
  }

  return result;
}

/** Sends this season's unsent emails, one contest at a time. Stops at the first contest the email service rate limits. */
export async function drainSeasonEmails(): Promise<void> {
  try {
    let hasSent = false;
    for (const contest of await getSeasonContests()) {
      const drained = await drainEmailQueue(contest.id, hasSent);
      if (drained.isRateLimited) return;
      hasSent = drained.hasSent;
    }
  } catch (error) {
    logger.error('drainSeasonEmails', error);
  }
}

/** True if a score was added or changed. */
async function applyToContest(contest: SeasonContest, game: SuperBowlGame): Promise<boolean> {
  const rowTeam = await storeRowTeam(contest, game);
  const squares = await loadSquares(contest.id);
  const planned = planScores(contest, rowTeam, game, squares);

  const { data: inserted, error: insertError } = await supabaseAdminClient
    .from('scores')
    .upsert(
      planned.map((score) => ({
        ...score,
        contest_id: contest.id,
        source: 'fundwell',
        entered_at: getCurrentISOString(),
      })),
      { onConflict: 'contest_id,quarter', ignoreDuplicates: true }
    )
    .select('id');
  if (insertError) throw new Error(`Failed to add scores: ${insertError.message}`);

  let isUpdated = inserted.length > 0;

  for (const score of await loadScores(contest.id)) {
    const plannedScore = planned.find(({ quarter }) => quarter === score.quarter);
    if (!plannedScore || score.source !== 'fundwell' || isSame(score, plannedScore)) continue;

    // The source is checked again here: an organizer's score stays, even one entered just now
    const { data: updated, error: updateError } = await supabaseAdminClient
      .from('scores')
      .update({ ...plannedScore, entered_at: getCurrentISOString() })
      .eq('contest_id', contest.id)
      .eq('quarter', score.quarter)
      .eq('source', 'fundwell')
      .select('id');
    if (updateError) throw new Error(`Failed to update a score: ${updateError.message}`);

    if (updated.length > 0) isUpdated = true;
  }

  // Read again for the winner revisions, which the database sets. Every Fundwell score is newer
  // than the email queue, so a winner without a queued email hasn't been emailed.
  for (const score of await loadScores(contest.id)) {
    if (score.source !== 'fundwell') continue;

    const recipientEmail = winnerEmailOf(squares, score.winning_square_id);
    if (!recipientEmail || !score.winning_square_id) continue;

    await enqueueWinnerEmail({
      contestId: contest.id,
      quarter: score.quarter,
      winnerRev: score.winner_rev,
      squareId: score.winning_square_id,
      recipientEmail,
    });
  }

  return isUpdated;
}

async function previewContest(contest: SeasonContest, rowTeam: SuperBowlTeam, game: SuperBowlGame) {
  const squares = await loadSquares(contest.id);
  const scores = await loadScores(contest.id);

  const { data: emails, error: emailsError } = await supabaseAdminClient
    .from('email_logs')
    .select('dedupe_key')
    .eq('contest_id', contest.id)
    .like('dedupe_key', 'winner:%');
  if (emailsError) throw new Error(`Failed to load emails: ${emailsError.message}`);

  let updated = false;
  let winners = 0;

  for (const planned of planScores(contest, rowTeam, game, squares)) {
    const score = scores.find(({ quarter }) => quarter === planned.quarter);
    if (score && score.source !== 'fundwell') continue;
    if (!score || !isSame(score, planned)) updated = true;

    let winnerRev = score?.winner_rev ?? 1;
    if (score && score.winning_square_id !== planned.winning_square_id) winnerRev++;

    const isQueued = emails.some(({ dedupe_key: key }) => key === `winner:${planned.quarter}:${winnerRev}`);
    if (!isQueued && winnerEmailOf(squares, planned.winning_square_id)) winners++;
  }

  return { updated, winners };
}

/** Stored at the first scoring, so renaming a team later can't flip the winners. */
async function storeRowTeam(contest: SeasonContest, game: SuperBowlGame): Promise<SuperBowlTeam> {
  const rowTeam = getRowTeam(contest, game);
  if (!rowTeam) throw new Error('No row team');
  if (contest.super_bowl_row_team) return rowTeam;

  const { data, error } = await supabaseAdminClient
    .from('contests')
    .update({ super_bowl_row_team: rowTeam })
    .eq('id', contest.id)
    .is('super_bowl_row_team', null)
    .select('id');
  if (error) throw new Error(`Failed to store the row team: ${error.message}`);
  if (data.length > 0) return rowTeam;

  // Set by someone else since the contest was loaded
  const { data: stored, error: storedError } = await supabaseAdminClient
    .from('contests')
    .select('super_bowl_row_team')
    .eq('id', contest.id)
    .single();
  if (storedError) throw new Error(`Failed to load the row team: ${storedError.message}`);

  return stored.super_bowl_row_team as SuperBowlTeam;
}

async function loadSquares(contestId: string) {
  const { data, error } = await supabaseAdminClient
    .from('squares')
    .select('id, row_index, col_index, payment_status, square_claimants(email)')
    .eq('contest_id', contestId);
  if (error) throw new Error(`Failed to load squares: ${error.message}`);
  return data;
}

async function loadScores(contestId: string) {
  const { data, error } = await supabaseAdminClient
    .from('scores')
    .select('quarter, home_score, away_score, winning_square_id, source, winner_rev')
    .eq('contest_id', contestId);
  if (error) throw new Error(`Failed to load scores: ${error.message}`);
  return data;
}

type LoadedSquares = Awaited<ReturnType<typeof loadSquares>>;

/** The entered quarters, as this contest's rows (home) and columns (away). */
function planScores(
  contest: SeasonContest,
  rowTeam: SuperBowlTeam,
  game: SuperBowlGame,
  squares: LoadedSquares
): PlannedScore[] {
  const colTeam = rowTeam === 'afc' ? 'nfc' : 'afc';

  return SUPER_BOWL_QUARTERS.flatMap((quarter) => {
    const rowScore = game[`${quarter}_${rowTeam}`];
    const colScore = game[`${quarter}_${colTeam}`];
    if (rowScore === null || colScore === null) return [];

    const square = findWinningSquare(squares, contest.row_numbers, contest.col_numbers, rowScore, colScore);
    return { quarter, home_score: rowScore, away_score: colScore, winning_square_id: square?.id ?? null };
  });
}

function isSame(score: Omit<PlannedScore, 'quarter'>, planned: PlannedScore): boolean {
  return (
    score.home_score === planned.home_score &&
    score.away_score === planned.away_score &&
    score.winning_square_id === planned.winning_square_id
  );
}

/** Null when nobody claimed the square or the claim has no email. */
function winnerEmailOf(squares: LoadedSquares, winningSquareId: string | null): string | null {
  const square = squares.find(({ id }) => id === winningSquareId);
  if (!square || square.payment_status === PaymentStatus.AVAILABLE) return null;
  return square.square_claimants?.email ?? null;
}

function hasScores(game: SuperBowlGame): boolean {
  return SUPER_BOWL_QUARTERS.some((quarter) => game[`${quarter}_afc`] !== null);
}
