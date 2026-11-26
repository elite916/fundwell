import { Database } from '@/libs/supabase/types';

import { formatPrizeAmount } from './prize-helpers';

type Pledge = Database['public']['Tables']['pledges']['Row'];

/**
 * What a pledge comes to with a player's entered hits: per hit, the amount times the hits, or the cap if lower; a
 * flat gift, its amount. Before hits are entered (`hits` null), the most a per-hit pledge could come to: the amount
 * times the pitches, or the cap if lower. Once the amount owed is known (a flat gift, or after the lock), that.
 */
export function pledgeTotal(
  pledge: Pick<Pledge, 'kind' | 'amount' | 'cap' | 'amount_owed'>,
  hits: number | null,
  pitchesPerPlayer: number
): number {
  if (pledge.amount_owed !== null) return Number(pledge.amount_owed);
  if (pledge.kind === 'flat') return Number(pledge.amount);
  const total = Number(pledge.amount) * (hits ?? pitchesPerPlayer);
  return pledge.cap !== null ? Math.min(total, Number(pledge.cap)) : total;
}

/** "$5 a hit, up to $40" · "$5 a hit" · "$50 flat" */
export function pledgeLabel(pledge: Pick<Pledge, 'kind' | 'amount' | 'cap'>): string {
  if (pledge.kind === 'flat') return `${formatPrizeAmount(Number(pledge.amount))} flat`;
  const perHit = `${formatPrizeAmount(Number(pledge.amount))} a hit`;
  return pledge.cap !== null ? `${perHit}, up to ${formatPrizeAmount(Number(pledge.cap))}` : perHit;
}

/** Adds money in cents, so totals of amounts like $2.50 stay exact. */
export function sumMoney(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + Math.round(amount * 100), 0) / 100;
}
