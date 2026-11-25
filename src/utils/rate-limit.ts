import { headers } from 'next/headers';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { logger } from '@/utils/logger';

// Server-only. Fixed-window limits kept in the database (`rate_limits`), so
// every server instance shares them. Not a 'use server' file, so nothing here
// is callable from the browser.

export interface RateLimit {
  max: number;
  windowSeconds: number;
}

export async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0].trim();
  return headerStore.get('x-real-ip') || forwardedFor || 'unknown';
}

/**
 * Counts an attempt against a limit and returns whether it is within it.
 * Throws if the limiter can't be reached; the caller decides what that means.
 */
export async function hitRateLimit(key: string, limit: RateLimit): Promise<boolean> {
  const { data, error } = await supabaseAdminClient.rpc('rate_limit_hit', {
    p_key: key,
    p_max: limit.max,
    p_window_seconds: limit.windowSeconds,
  });
  if (error) {
    logger.error('rate limit', error);
    throw new Error('Rate limit check failed');
  }
  return data;
}

/** Gives back an attempt that shouldn't count. */
export async function undoRateLimitHit(key: string, limit: RateLimit): Promise<void> {
  const { error } = await supabaseAdminClient.rpc('rate_limit_undo_hit', {
    p_key: key,
    p_window_seconds: limit.windowSeconds,
  });
  if (error) logger.error('rate limit', error);
}
