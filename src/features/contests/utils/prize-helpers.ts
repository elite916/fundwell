import { Database } from '@/libs/supabase/types';

import { ContestPrizeFields } from '../types';

type GameQuarter = Database['public']['Enums']['game_quarter'];

/** @deprecated Use ContestPrizeFields instead */
export type PrizeTexts = Pick<
  ContestPrizeFields,
  'prize_q1_text' | 'prize_q2_text' | 'prize_q3_text' | 'prize_final_text'
>;

/**
 * Returns the prize text for a given quarter when prize_type is 'custom', or null otherwise.
 */
export function getPrizeText(
  prizeType: ContestPrizeFields['prize_type'],
  quarter: GameQuarter,
  prizeTexts: ContestPrizeFields
): string | null {
  if (prizeType !== 'custom') return null;

  const prizeMap: Record<GameQuarter, string | null | undefined> = {
    q1: prizeTexts.prize_q1_text,
    q2: prizeTexts.prize_q2_text,
    q3: prizeTexts.prize_q3_text,
    final: prizeTexts.prize_final_text,
  };

  return prizeMap[quarter] ?? null;
}

/**
 * Counts the squares sold: claimed squares, pending or paid.
 */
export function countSoldSquares(squares: { payment_status: string }[]): number {
  return squares.filter((s) => s.payment_status !== 'available').length;
}

/**
 * A quarter's prize: squares sold × square price × that quarter's payout %.
 */
export function calculatePrizeAmount(squaresSold: number, squarePrice: number, payoutPercent: number): number {
  return (squaresSold * Number(squarePrice) * payoutPercent) / 100;
}

/**
 * Formats a prize amount: "$50", or "$46.25" when there are cents.
 */
export function formatPrizeAmount(amount: number): string {
  const digits = Math.round(amount * 100) % 100 === 0 ? 0 : 2;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
