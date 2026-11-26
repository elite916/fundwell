import { getClientIp, hashLimitKey, hitRateLimit, type RateLimit, undoRateLimitHit } from '@/utils/rate-limit';

// Server-only limits on hit-a-thon pledges. Their own keys, so squares claims are unaffected. Not a 'use server'
// file, so nothing here is callable from the browser.

// Pledges per email address, as for squares claims.
const EMAIL_LIMIT = { max: 10, windowSeconds: 60 };
// Pledges per hit-a-thon from one IP, as for squares claims.
const IP_LIMIT = { max: 50, windowSeconds: 60 * 60 };
// Successful pledges per hit-a-thon (Brent, 2026-11-25: 500 an hour).
const CONTEST_LIMIT = { max: 500, windowSeconds: 60 * 60 };

const contestKey = (contestId: string) => `pledge:contest:${contestId}`;

/**
 * Fails open: if the limiter can't be reached, pledges go on (hitRateLimit reports the error). The database still
 * checks the hit-a-thon is open.
 */
async function isWithinLimit(key: string, limit: RateLimit): Promise<boolean> {
  try {
    return await hitRateLimit(key, limit);
  } catch {
    return true;
  }
}

/**
 * Counts a pledge attempt and returns whether it may go on. Call it before `create_pledge`, so parallel attempts
 * can't slip past the limits. The IP comes first, so its limit caps what one visitor can take from anyone else's.
 */
export async function isPledgeWithinLimits(contestId: string, email: string): Promise<boolean> {
  const ip = await getClientIp();
  if (!(await isWithinLimit(`pledge:ip:${contestId}:${hashLimitKey('ip', contestId, ip)}`, IP_LIMIT))) return false;
  if (!(await isWithinLimit(`pledge:email:${hashLimitKey('email', email.toLowerCase())}`, EMAIL_LIMIT))) return false;
  if (!(await isWithinLimit(contestKey(contestId), CONTEST_LIMIT))) {
    await undoContestPledgeHit(contestId);
    return false;
  }
  return true;
}

/** Gives a refused attempt back to the hit-a-thon, so failed attempts can't lock it. */
export async function undoContestPledgeHit(contestId: string): Promise<void> {
  await undoRateLimitHit(contestKey(contestId), CONTEST_LIMIT);
}
