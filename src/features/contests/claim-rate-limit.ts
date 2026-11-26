import { getClientIp, hashLimitKey, hitRateLimit, type RateLimit, undoRateLimitHit } from '@/utils/rate-limit';

// Server-only limits on claiming squares. Every claim emails the typed
// address, so these bound how many emails a visitor can trigger. Not a
// 'use server' file, so nothing here is callable from the browser.

// Claims per email address.
const EMAIL_LIMIT = { max: 10, windowSeconds: 60 };
// Claims per contest from one IP (Brent, 2026-11-24: 50): a watch party of 40
// on shared Wi-Fi, one square each, with some room for retries. Below
// CONTEST_LIMIT with the same window, so one visitor can't use up the whole
// contest's allowance.
const IP_LIMIT = { max: 50, windowSeconds: 60 * 60 };
// Successful claims per contest: a full board of 100, plus squares the owner
// releases and people claim again.
const CONTEST_LIMIT = { max: 150, windowSeconds: 60 * 60 };

const contestKey = (contestId: string) => `claim:contest:${contestId}`;

/**
 * Fails open: if the limiter can't be reached, claims go on (hitRateLimit
 * reports the error). The database still enforces the contest's status and its
 * 100 squares, so the emails a stranger can trigger stay bounded.
 */
async function isWithinLimit(key: string, limit: RateLimit): Promise<boolean> {
  try {
    return await hitRateLimit(key, limit);
  } catch {
    return true;
  }
}

/**
 * Counts a claim attempt and returns whether it may go on. Call it before
 * `claim_square`, so parallel attempts can't slip past the limits. A refused
 * attempt isn't counted against the limits after it. The IP comes first, so its
 * limit caps what one visitor can take from anyone else's.
 */
export async function isClaimWithinLimits(contestId: string, email: string): Promise<boolean> {
  const ip = await getClientIp();
  if (!(await isWithinLimit(`claim:ip:${contestId}:${hashLimitKey('ip', contestId, ip)}`, IP_LIMIT))) return false;
  if (!(await isWithinLimit(`claim:email:${hashLimitKey('email', email.toLowerCase())}`, EMAIL_LIMIT))) return false;
  if (!(await isWithinLimit(contestKey(contestId), CONTEST_LIMIT))) {
    await undoContestClaimHit(contestId);
    return false;
  }
  return true;
}

/**
 * Gives an attempt that didn't claim a square (taken, per-person limit reached,
 * refused) back to the contest, so failed attempts can't lock it. They still
 * count for the IP and the email, because the answer can tell whether an
 * address already has squares.
 */
export async function undoContestClaimHit(contestId: string): Promise<void> {
  await undoRateLimitHit(contestKey(contestId), CONTEST_LIMIT);
}
