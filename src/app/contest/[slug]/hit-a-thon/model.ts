import type { Contest } from '@/features/contests/types';
import { formatPrizeAmount } from '@/features/contests/utils';
import type { HitPlayer } from '@/features/contests/utils/hit-players';

/** A player as the public page shows them: first name, number, and their pledges summed. */
export interface PublicHitPlayer extends HitPlayer {
  pledged: number;
  supporters: number;
}

/** The hit-a-thon fields the public page uses, as `hit-a-thon-page.tsx` sends them. */
export interface PublicHitAThon {
  id: string;
  name: string;
  status: Contest['status'];
  hitsLocked: boolean;
  pitchesPerPlayer: number;
  playerGoal: number | null;
}

/** "Sam #7", or "Sam" without a number. */
export function playerTitle({ first_name, number }: Pick<HitPlayer, 'first_name' | 'number'>): string {
  return number ? `${first_name} #${number}` : first_name;
}

/** "$120 pledged · 3 supporters", "$10 pledged · 1 supporter" */
export function pledgedLine(pledged: number, supporters: number): string {
  return `${formatPrizeAmount(pledged)} pledged · ${supporters} ${supporters === 1 ? 'supporter' : 'supporters'}`;
}

/** Shown when it isn't taking pledges. Open, and a draft (only its owner sees it), add nothing. */
export function statusLine({ status, hitsLocked }: Pick<PublicHitAThon, 'status' | 'hitsLocked'>): string | null {
  if (status === 'completed') return 'This fundraiser has ended. Thank you!';
  if (hitsLocked) return 'Totals are in. Check your email for yours.';
  if (status === 'locked') return 'Pledges are closed.';
  return null;
}

export function isTakingPledges({ status, hitsLocked }: Pick<PublicHitAThon, 'status' | 'hitsLocked'>): boolean {
  return status === 'open' && !hitsLocked;
}

/** The most a per-hit pledge could come to: the amount times the pitches, or the cap if lower. */
export function mostOwed(amount: number, pitches: number, cap?: number): number {
  const most = amount * pitches;
  return cap !== undefined && cap < most ? cap : most;
}

/** "Most you'd pay: $5 × 10 pitches = $50" ("× 1 pitch"), or "Most you'd pay: $40, your cap" when the cap is lower. */
export function mostLine(amount: number, pitches: number, cap?: number): string {
  const most = amount * pitches;
  return cap !== undefined && cap < most
    ? `Most you'd pay: ${formatPrizeAmount(cap)}, your cap`
    : `Most you'd pay: ${formatPrizeAmount(amount)} × ${pitches} ${pitches === 1 ? 'pitch' : 'pitches'} = ${formatPrizeAmount(most)}`;
}

/** How far along the goal is, from 0 to 100. */
export function percentOf(pledged: number, goal: number): number {
  return Math.min(100, Math.round((pledged / goal) * 100));
}
