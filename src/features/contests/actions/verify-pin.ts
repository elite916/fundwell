'use server';

import { cookies, headers } from 'next/headers';
import { timingSafeEqual } from 'crypto';

import { contestAccessCookieName, contestAccessToken } from '@/features/contests/access';
import { getContestPin } from '@/features/contests/queries';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { logger } from '@/utils/logger';

interface VerifyPinInput {
  contestSlug: string;
  enteredPin: string;
}

interface VerifyPinResponse {
  data: { success: boolean } | null;
  error: { message: string } | null;
}

// Failed PIN attempts allowed per window: per contest and IP, and per contest
// from all IPs together.
const IP_LIMIT = { max: 10, windowSeconds: 15 * 60 };
const CONTEST_LIMIT = { max: 100, windowSeconds: 60 * 60 };

async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0].trim();
  return headerStore.get('x-real-ip') || forwardedFor || 'unknown';
}

/**
 * Counts an attempt against a limit and returns whether it is within it.
 * Throws if the limiter can't be reached, so the PIN check fails closed.
 */
async function hitRateLimit(key: string, limit: { max: number; windowSeconds: number }): Promise<boolean> {
  const { data, error } = await supabaseAdminClient.rpc('rate_limit_hit', {
    p_key: key,
    p_max: limit.max,
    p_window_seconds: limit.windowSeconds,
  });
  if (error) {
    logger.error('verifyPin rate limit', error);
    throw new Error('Rate limit check failed');
  }
  return data;
}

async function undoRateLimitHit(key: string, limit: { windowSeconds: number }): Promise<void> {
  const { error } = await supabaseAdminClient.rpc('rate_limit_undo_hit', {
    p_key: key,
    p_window_seconds: limit.windowSeconds,
  });
  if (error) logger.error('verifyPin rate limit', error);
}

/**
 * Verifies a PIN for accessing a private contest.
 * If successful, sets a cookie to remember access for 7 days.
 * Failed attempts are rate-limited in the database (see IP_LIMIT and CONTEST_LIMIT).
 */
export async function verifyPin(input: VerifyPinInput): Promise<VerifyPinResponse> {
  const { contestSlug, enteredPin } = input;

  if (!contestSlug || !enteredPin) {
    return {
      data: null,
      error: { message: 'Contest slug and PIN are required' },
    };
  }

  // Fetch contest access PIN
  const accessPin = await getContestPin(contestSlug);

  if (accessPin === null) {
    return {
      data: null,
      error: { message: 'Contest not found' },
    };
  }

  // Count the attempt before comparing, so parallel guesses can't slip past
  // the limit. A correct PIN gives its attempt back below.
  const ip = await getClientIp();
  const ipKey = `pin:ip:${contestSlug}:${ip}`;
  const contestKey = `pin:contest:${contestSlug}`;
  const withinLimits = (await hitRateLimit(ipKey, IP_LIMIT)) && (await hitRateLimit(contestKey, CONTEST_LIMIT));

  if (!withinLimits) {
    return {
      data: { success: false },
      error: { message: 'Too many attempts. Try again in a few minutes.' },
    };
  }

  // Compare PINs (case-insensitive, timing-safe)
  const normalizedCorrect = accessPin.toUpperCase();
  const normalizedEntered = enteredPin.toUpperCase();

  // Convert to buffers for timing-safe comparison
  const correctBuffer = Buffer.from(normalizedCorrect);
  const enteredBuffer = Buffer.from(normalizedEntered);

  // Pad shorter buffer to match longer to prevent timing leaks
  const maxLength = Math.max(correctBuffer.length, enteredBuffer.length);
  const paddedCorrect = Buffer.alloc(maxLength);
  const paddedEntered = Buffer.alloc(maxLength);
  correctBuffer.copy(paddedCorrect, 0);
  enteredBuffer.copy(paddedEntered, 0);

  const isCorrect = timingSafeEqual(paddedCorrect, paddedEntered);

  if (!isCorrect) {
    return {
      data: { success: false },
      error: { message: 'Incorrect PIN' },
    };
  }

  // Only failed attempts count against the limits
  await Promise.all([undoRateLimitHit(ipKey, IP_LIMIT), undoRateLimitHit(contestKey, CONTEST_LIMIT)]);

  // Set access cookie (expires in 7 days)
  const cookieStore = await cookies();
  const cookieName = contestAccessCookieName(contestSlug);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  cookieStore.set(cookieName, contestAccessToken(contestSlug, accessPin), {
    expires: expiresAt,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return {
    data: { success: true },
    error: null,
  };
}
