'use client';

import { FOOTBALL_QUARTER_LABELS } from '@/features/contests/constants';
import { GridSquare } from '@/features/contests/queries/get-squares';
import { ContestPrizeFields } from '@/features/contests/types';
import { calculatePrizeAmount, countSoldSquares, formatPrizeAmount, getPrizeText } from '@/features/contests/utils';
import { Database } from '@/libs/supabase/types';
import { cn } from '@/utils/cn';

import css from './run.module.css';

type Score = Database['public']['Tables']['scores']['Row'];
type GameQuarter = Database['public']['Enums']['game_quarter'];
type SportType = Database['public']['Enums']['sport_type'];

interface Contest extends ContestPrizeFields {
  sport_type: SportType;
  row_team_name: string;
  col_team_name: string;
  square_price: number;
  payout_q1_percent: number | null;
  payout_q2_percent: number | null;
  payout_q3_percent: number | null;
  payout_final_percent: number | null;
  payout_game1_percent: number | null;
  payout_game2_percent: number | null;
  payout_game3_percent: number | null;
  payout_game4_percent: number | null;
  payout_game5_percent: number | null;
  payout_game6_percent: number | null;
  payout_game7_percent: number | null;
  super_bowl_season: number | null;
}

interface WinnersSectionProps {
  contest: Contest;
  scores: Score[];
  squares: GridSquare[];
}

const FOOTBALL_QUARTERS = FOOTBALL_QUARTER_LABELS.map((q) => ({
  quarter: q.key as GameQuarter,
  label: q.label,
  payoutKey: q.dbField as keyof Contest,
}));

const BASEBALL_GAMES: { quarter: GameQuarter; label: string; payoutKey: keyof Contest }[] = [
  { quarter: 'q1', label: 'Game 1', payoutKey: 'payout_game1_percent' },
  { quarter: 'q2', label: 'Game 2', payoutKey: 'payout_game2_percent' },
  { quarter: 'q3', label: 'Game 3', payoutKey: 'payout_game3_percent' },
  { quarter: 'final', label: 'Game 4', payoutKey: 'payout_game4_percent' },
];

function getQuarterConfig(sportType: SportType) {
  return sportType === 'football' ? FOOTBALL_QUARTERS : BASEBALL_GAMES;
}

function getWinnerName(square: GridSquare | undefined): string {
  if (!square) return 'Unclaimed';
  if (!square.claimant_first_name) return 'Unclaimed';

  let name = square.claimant_first_name;
  if (square.claimant_last_name) {
    name += ` ${square.claimant_last_name}`;
  }
  return name;
}

function getSourceLabel(contest: Contest, score: Score): string | null {
  if (contest.super_bowl_season === null) return null;
  if (score.source === 'fundwell') return 'Entered by Fundwell';
  return score.source === 'organizer' ? 'Entered by you' : null;
}

export function WinnersSection({ contest, scores, squares }: WinnersSectionProps) {
  if (scores.length === 0) {
    return null;
  }

  const quarterConfig = getQuarterConfig(contest.sport_type);
  const squaresSold = countSoldSquares(squares);

  // Create a map of squares by ID for quick lookup
  const squaresMap = new Map(squares.map((sq) => [sq.id, sq]));

  // Get scores with winner info
  const scoresWithWinners = scores
    .map((score) => {
      const config = quarterConfig.find((q) => q.quarter === score.quarter);
      if (!config) return null;

      const payoutPercent = contest[config.payoutKey] as number | null;
      const payoutAmount =
        payoutPercent != null ? calculatePrizeAmount(squaresSold, contest.square_price, payoutPercent) : null;
      const prizeText = getPrizeText(contest.prize_type, score.quarter, contest);
      const winningSquare = score.winning_square_id ? squaresMap.get(score.winning_square_id) : undefined;

      return {
        quarter: score.quarter,
        label: config.label,
        homeScore: score.home_score,
        awayScore: score.away_score,
        winnerName: getWinnerName(winningSquare),
        payoutAmount,
        prizeText,
        sourceLabel: getSourceLabel(contest, score),
      };
    })
    .filter(Boolean);

  if (scoresWithWinners.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby='winners' className={cn(css.card, css.winners)}>
      <h2 id='winners'>Winners</h2>
      <p>Scores and winners for each {contest.sport_type === 'football' ? 'quarter' : 'game'}</p>
      <ul className={css.wins}>
        {scoresWithWinners.map((item) => (
          <li key={item!.quarter}>
            <b>{item!.label}</b>
            {contest.prize_type === 'custom' && item!.prizeText ? (
              <span className={css.prize}>{item!.prizeText}</span>
            ) : item!.payoutAmount != null ? (
              <span className={css.prize}>{formatPrizeAmount(item!.payoutAmount)}</span>
            ) : null}
            <span className={css.won}>{item!.winnerName}</span>
            <span className={css.score}>
              {contest.row_team_name} {item!.homeScore} - {contest.col_team_name} {item!.awayScore}
            </span>
            {item!.sourceLabel && <span className={css.score}>{item!.sourceLabel}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
