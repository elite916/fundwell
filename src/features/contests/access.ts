import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

import { getEnvVar } from '@/utils/get-env-var';

// Server-only helpers for PIN-protected contests. Not a 'use server' file, so
// nothing here is callable from the browser.

export function contestAccessCookieName(contestSlug: string): string {
  return `contest_access_${contestSlug}`;
}

/**
 * The access cookie's value: an HMAC of the contest slug and its current PIN,
 * keyed by a server secret, so it can't be computed from a guessed PIN.
 * Changing the PIN invalidates existing cookies.
 */
export function contestAccessToken(contestSlug: string, accessPin: string): string {
  const secret = getEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
  return createHmac('sha256', secret).update(`fundwell:contest-access\0${contestSlug}\0${accessPin}`).digest('hex');
}

/**
 * Checks if the user has access to a PIN-protected contest.
 * Returns true if no PIN is required or if the user has a valid access cookie.
 */
export async function hasContestAccess(contestSlug: string, accessPin: string | null): Promise<boolean> {
  // No PIN required - public access
  if (!accessPin) {
    return true;
  }

  // Check for access cookie
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(contestAccessCookieName(contestSlug));
  if (!accessCookie) {
    return false;
  }

  const expected = Buffer.from(contestAccessToken(contestSlug, accessPin));
  const actual = Buffer.from(accessCookie.value);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
