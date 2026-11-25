import { claimantName, type GridSquare } from '@/components/studio/grid/model';
import { FOOTBALL_QUARTER_LABELS, TOTAL_SQUARES } from '@/features/contests/constants';
import type { GameQuarter, Score } from '@/features/contests/types';
import { calculatePrizeAmount, countSoldSquares, formatPrizeAmount, getPrizeText } from '@/features/contests/utils';

import type { SquaresContest } from './types';

export interface PrizeLine {
  label: string;
  /** A dollar amount or the organizer's own words. Null when that quarter pays nothing. */
  prize: string | null;
  notes: string[];
}

export interface PrizeList {
  kind: 'payouts' | 'winners';
  lines: PrizeLine[];
  leftForTeam: string | null;
}

function payoutPercent(contest: SquaresContest, quarter: GameQuarter): number {
  return (
    {
      q1: contest.payout_q1_percent,
      q2: contest.payout_q2_percent,
      q3: contest.payout_q3_percent,
      final: contest.payout_final_percent,
    }[quarter] ?? 0
  );
}

/** What a quarter pays with this many squares sold. */
export function prizeFor(contest: SquaresContest, quarter: GameQuarter, squaresSold: number): string | null {
  const text = getPrizeText(contest.prize_type, quarter, contest);
  if (text) return text;

  const percent = payoutPercent(contest, quarter);
  return percent > 0 ? formatPrizeAmount(calculatePrizeAmount(squaresSold, contest.square_price, percent)) : null;
}

/** Who won a score: their name, or null when nobody claimed the square. */
export function winnerName(score: Score, squares: readonly GridSquare[]): string | null {
  const square = squares.find(({ id }) => id === score.winning_square_id);
  if (!square || square.payment_status === 'available') return null;
  return claimantName(square) || `Row ${square.row_index + 1}, column ${square.col_index + 1}`;
}

function baseballGames(contest: SquaresContest) {
  return [
    contest.payout_game1_percent,
    contest.payout_game2_percent,
    contest.payout_game3_percent,
    contest.payout_game4_percent,
    contest.payout_game5_percent,
    contest.payout_game6_percent,
    contest.payout_game7_percent,
  ].map((percent, i) => ({ label: `Game ${i + 1}`, percent: percent ?? 0 }));
}

function leftForTeam(contest: SquaresContest, percents: number[], squaresSold: number): string | null {
  const percent = 100 - percents.reduce((sum, p) => sum + p, 0);
  if (contest.prize_type === 'custom' || percent <= 0) return null;
  return formatPrizeAmount(calculatePrizeAmount(squaresSold, contest.square_price, percent));
}

/** The payouts before the first winner, the winners after. Null when there is nothing to list. */
export function prizeList(
  contest: SquaresContest,
  squares: readonly GridSquare[],
  scores: readonly Score[]
): PrizeList | null {
  const squaresSold = countSoldSquares([...squares]);
  const isBaseball = contest.sport_type === 'baseball';
  const quarterPercents = FOOTBALL_QUARTER_LABELS.map(({ key }) => payoutPercent(contest, key));

  if (scores.some((score) => score.winning_square_id)) {
    const lines = FOOTBALL_QUARTER_LABELS.flatMap(({ key, label }): PrizeLine[] => {
      const prize = prizeFor(contest, key, squaresSold);
      const score = scores.find(({ quarter }) => quarter === key);
      if (score?.winning_square_id) {
        return [
          {
            label,
            prize,
            notes: [
              winnerName(score, squares) ?? 'Nobody claimed that square.',
              `${contest.row_team_name} ${score.home_score} - ${contest.col_team_name} ${score.away_score}`,
            ],
          },
        ];
      }
      const isStillToCome = !score && !isBaseball && contest.status === 'in_progress';
      return isStillToCome && prize ? [{ label, prize, notes: ['Not played yet'] }] : [];
    });
    return {
      kind: 'winners',
      lines,
      leftForTeam: isBaseball ? null : leftForTeam(contest, quarterPercents, squaresSold),
    };
  }

  const games = baseballGames(contest).filter(({ percent }) => percent > 0);
  const lines: PrizeLine[] = isBaseball
    ? games.map(({ label, percent }) => ({
        label,
        prize: formatPrizeAmount(calculatePrizeAmount(TOTAL_SQUARES, contest.square_price, percent)),
        notes: [],
      }))
    : FOOTBALL_QUARTER_LABELS.map(({ key, label }) => ({
        label,
        prize:
          contest.prize_type === 'custom'
            ? getPrizeText(contest.prize_type, key, contest)
            : prizeFor(contest, key, TOTAL_SQUARES),
        notes: [],
      })).filter(({ prize }) => prize);

  if (lines.length === 0) return null;
  return {
    kind: 'payouts',
    lines,
    leftForTeam: leftForTeam(
      contest,
      isBaseball ? games.map(({ percent }) => percent) : quarterPercents,
      TOTAL_SQUARES
    ),
  };
}
