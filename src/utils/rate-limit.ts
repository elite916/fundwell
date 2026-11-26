import { headers } from 'next/headers';
import { createHmac } from 'crypto';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { getEnvVar } from '@/utils/get-env-var';
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

/** Keyed hash, so the limit rows hold no email or IP. */
export function hashLimitKey(...parts: string[]): string {
  const secret = getEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
  return createHmac('sha256', secret)
    .update(['fundwell:claim-limit', ...parts].join('\0'))
    .digest('hex');
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
