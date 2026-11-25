'use server';

import { after } from 'next/server';

import { ContestStatus, PaymentStatus } from '@/features/contests/constants';
import { ContestErrors } from '@/features/contests/constants/error-messages';
import {
  drainEmailQueue,
  enqueueOrganizerQuarterEmails,
  enqueueOrganizerSummaryEmail,
  enqueueWinnerEmail,
} from '@/features/emails/email-queue';
import { ActionResponse } from '@/types/action-response';
import { getCurrentISOString } from '@/utils/date-formatters';

import { ValidationError, withContestOwnership } from '../middleware/auth-middleware';
import { GameQuarter } from '../types';
import { findWinningSquare } from '../utils/find-winning-square';

interface ScoreInput {
  quarter: GameQuarter;
  homeScore: number;
  awayScore: number;
}

interface WinnerInfo {
  quarter: GameQuarter;
  homeScore: number;
  awayScore: number;
  winningSquareId: string | null;
  winnerName: string | null;
  winnerEmail: string | null;
}

interface SaveScoresResult {
  winners: WinnerInfo[];
}

/**
 * Saves game scores for a contest and calculates winning squares.
 * Only the contest owner can save scores, and the contest must be in 'in_progress' status.
 */
export async function saveScores(contestId: string, scores: ScoreInput[]): Promise<ActionResponse<SaveScoresResult>> {
  return withContestOwnership<SaveScoresResult>(contestId, async (user, supabase, contest) => {
    // Verify contest is in progress
    if (contest.status !== ContestStatus.IN_PROGRESS) {
      throw new ValidationError(ContestErrors.SCORES_ONLY_IN_PROGRESS);
    }

    // Verify row and column numbers are assigned
    if (!contest.row_numbers || !contest.col_numbers) {
      throw new ValidationError(ContestErrors.NUMBERS_REQUIRED);
    }

    // Fetch all squares for this contest
    const { data: squareRows, error: squaresError } = await supabase
      .from('squares')
      .select(
        'id, row_index, col_index, payment_status, claimant_first_name, claimant_last_name, square_claimants(email)'
      )
      .eq('contest_id', contestId);

    if (squaresError) {
      throw new Error('Failed to fetch squares');
    }

    const squares = squareRows?.map(({ square_claimants: claimant, ...square }) => ({
      ...square,
      claimant_email: claimant?.email ?? null,
    }));

    // Fetch existing scores to determine which quarters are new or changed. Without them, every quarter
    // would look new and its winner would be emailed again.
    const { data: existingScores, error: existingScoresError } = await supabase
      .from('scores')
      .select('quarter, home_score, away_score, winning_square_id')
      .eq('contest_id', contestId);

    if (existingScoresError) {
      throw new Error('Failed to fetch scores');
    }

    const existingScoreMap = new Map(existingScores.map((s) => [s.quarter, s]));

    // Runs after the response, whatever happens below, so a saved quarter's email still goes out
    after(() => drainEmailQueue(contestId));

    const winners: WinnerInfo[] = [];
    const isSuperBowl = contest.super_bowl_season !== null;
    let isSaved = false;

    // Process each score entry
    for (const score of scores) {
      const winningSquare = findWinningSquare(
        squares ?? [],
        contest.row_numbers,
        contest.col_numbers,
        score.homeScore,
        score.awayScore
      );
      const winningSquareId = winningSquare?.id || null;

      // Build winner name if square was claimed
      let winnerName: string | null = null;
      if (winningSquare?.claimant_first_name) {
        winnerName = winningSquare.claimant_first_name;
        if (winningSquare.claimant_last_name) {
          winnerName += ` ${winningSquare.claimant_last_name}`;
        }
      }

      winners.push({
        quarter: score.quarter,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        winningSquareId,
        winnerName,
        winnerEmail: winningSquare?.claimant_email || null,
      });

      const existingScore = existingScoreMap.get(score.quarter);
      if (existingScore?.home_score === score.homeScore && existingScore.away_score === score.awayScore) {
        continue;
      }

      // Upsert the score (update if quarter exists, insert if not)
      const { data: savedScore, error: upsertError } = await supabase
        .from('scores')
        .upsert(
          {
            contest_id: contestId,
            quarter: score.quarter,
            home_score: score.homeScore,
            away_score: score.awayScore,
            winning_square_id: winningSquareId,
            entered_at: getCurrentISOString(),
          },
          {
            onConflict: 'contest_id,quarter',
          }
        )
        .select('quarter, winner_rev')
        .single();

      if (upsertError) {
        throw new Error(`Failed to save score for ${score.quarter}`);
      }
      isSaved = true;

      // Queue the winner notification email if this is a new winner
      const isNewWinner = !existingScore || winningSquareId !== existingScore.winning_square_id;

      if (isNewWinner && winningSquare?.claimant_email && winningSquare.payment_status !== PaymentStatus.AVAILABLE) {
        await enqueueWinnerEmail({
          contestId,
          quarter: score.quarter,
          winnerRev: savedScore.winner_rev,
          squareId: winningSquare.id,
          recipientEmail: winningSquare.claimant_email,
        });
      }

      if (isNewWinner && isSuperBowl) {
        await enqueueOrganizerQuarterEmails({ contestId, ownerId: contest.owner_id, scores: [savedScore] });
      }
    }

    if (isSaved && isSuperBowl) await enqueueOrganizerSummaryEmail(contestId, contest.owner_id);

    return { winners };
  })();
}
