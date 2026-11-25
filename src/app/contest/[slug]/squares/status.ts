import { type GridSquare, squaresOf } from '@/components/studio/grid/model';
import type { GameQuarter, Score } from '@/features/contests/types';
import { countSoldSquares, formatPrizeAmount } from '@/features/contests/utils';

import { prizeFor, winnerName } from './prizes';
import type { SquaresContest } from './types';

export interface Status {
  /** The huge lines. */
  headline: [string, string?];
  news: string | null;
  detail?: string | null;
  tone: 'strong' | 'soft';
}

const PLAYED_IN_ORDER: GameQuarter[] = ['q1', 'q2', 'q3', 'final'];
const WON: Record<GameQuarter, string> = {
  q1: 'won Q1',
  q2: 'won halftime',
  q3: 'won Q3',
  final: 'won the final',
};

/** The last quarter with a saved score. */
export function latestScore(scores: readonly Score[]): Score | null {
  return PLAYED_IN_ORDER.flatMap((quarter) => scores.find((score) => score.quarter === quarter) ?? []).at(-1) ?? null;
}

export function hasNumbers(contest: SquaresContest): boolean {
  return contest.row_numbers?.length === 10 && contest.col_numbers?.length === 10;
}

/** Where the contest stands, in the words at the top of the page. */
export function statusOf(contest: SquaresContest, squares: readonly GridSquare[], scores: readonly Score[]): Status {
  const numbersIn = 'The numbers are in. Find your squares to see yours.';
  const latest = latestScore(scores);

  if (latest && (contest.status === 'in_progress' || contest.status === 'completed')) {
    const name = winnerName(latest, squares);
    return {
      // Scores are saved as home and away: the rows' team is home
      headline: [`${contest.row_team_name} ${latest.home_score}`, `${contest.col_team_name} ${latest.away_score}`],
      news: name ? `${name} ${WON[latest.quarter]}` : 'Nobody claimed that square.',
      detail: name && prizeFor(contest, latest.quarter, countSoldSquares([...squares])),
      tone: 'strong',
    };
  }

  switch (contest.status) {
    case 'draft':
      return {
        headline: ['Draft'],
        news: 'This contest is still in draft mode and not yet open for square claims.',
        tone: 'soft',
      };
    case 'open': {
      const left = squares.length - countSoldSquares([...squares]);
      const limit = contest.max_squares_per_person;
      const price = `${formatPrizeAmount(Number(contest.square_price))} each${limit ? `, up to ${limit} per person` : ''}.`;
      return left > 0
        ? {
            headline: [`${left} ${left === 1 ? 'square' : 'squares'}`, 'left'],
            news: `${price} Tap any available square to claim it.`,
            tone: 'soft',
          }
        : { headline: ['All squares', 'claimed'], news: null, tone: 'soft' };
    }
    case 'locked':
      return {
        headline: ['Waiting for', 'the game'],
        news: hasNumbers(contest) ? numbersIn : 'This contest is locked. No more squares can be claimed.',
        tone: 'soft',
      };
    case 'in_progress':
      return { headline: ['Game in', 'progress'], news: hasNumbers(contest) ? numbersIn : null, tone: 'soft' };
    case 'completed':
      return { headline: ['Completed'], news: 'This contest has been completed.', tone: 'soft' };
  }
}

/** "Otters’", "Heat’s" */
function possessive(team: string): string {
  return /s$/i.test(team) ? `${team}’` : `${team}’s`;
}

/** Which team runs which way on the board. */
export function axisNote(contest: SquaresContest): string {
  const { row_team_name: rows, col_team_name: cols, status } = contest;
  const isPlaying = status === 'in_progress' || status === 'completed';
  return isPlaying && hasNumbers(contest)
    ? `${possessive(rows)} last digit down, ${possessive(cols)} across`
    : `${rows} down, ${cols} across`;
}

/** What "Find your squares" says about a name: how many, and their numbers once those are in. */
export function foundText(contest: SquaresContest, squares: readonly GridSquare[], name: string): string {
  const found = squaresOf(squares, name);
  if (found.length === 0) return '';
  if (contest.status === 'open' || !hasNumbers(contest)) {
    return `${found.length} ${found.length === 1 ? 'square' : 'squares'}`;
  }

  // Word joiners keep each pair of numbers on one line
  const pairs = found.map(
    ({ row_index, col_index }) => `${contest.row_numbers?.[row_index]}⁠–⁠${contest.col_numbers?.[col_index]}`
  );
  return `${contest.row_team_name}, then ${contest.col_team_name}: ${pairs.join(', ')}`;
}

/** How many characters have to fit on one line, so that long team names take two lines at most. */
export function charactersToFit(lines: readonly string[]): number {
  const longestLine = Math.max(...lines.map((line) => line.length));
  const longestWord = Math.max(...lines.flatMap((line) => line.split(' ')).map((word) => word.length));
  return Math.min(24, Math.max(longestWord, Math.ceil(longestLine / 2) + 2, Math.min(longestLine, 11)));
}
