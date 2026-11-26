import { type HitPlayer, sortHitPlayers } from '@/features/contests/utils/hit-players';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Database } from '@/libs/supabase/types';
import { logger } from '@/utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A hit-a-thon's players, for the owner's settings and Team Members pages and the public page.
 * Pass `client` to read with another client (the contest page passes the service role after its PIN check).
 */
export async function getHitPlayers(contestId: string, client?: SupabaseClient<Database>): Promise<HitPlayer[]> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase
    .from('hit_players')
    .select('id, first_name, number, slug')
    .eq('contest_id', contestId);

  if (error) {
    logger.error('getHitPlayers', error, { contestId });
    throw new Error(`Failed to fetch players: ${error.message}`);
  }

  return sortHitPlayers(data ?? []);
}

/**
 * Supporters and amount pledged per player, cancelled pledges left out. The amount is what the supporter owes once
 * it's known (a flat gift, or a per-hit pledge after hits are locked); before that, the most a per-hit pledge could
 * come to: the amount times the pitches, or the cap if lower.
 * Pass `client` to read with another client (the contest page passes the service role after its PIN check).
 */
export async function getHitPlayerPledgeTotals(
  contestId: string,
  pitchesPerPlayer: number,
  client?: SupabaseClient<Database>
): Promise<Record<string, { supporters: number; pledged: number }>> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase
    .from('pledges')
    .select('player_id, kind, amount, cap, amount_owed')
    .eq('contest_id', contestId)
    .neq('status', 'cancelled');

  if (error) {
    logger.error('getHitPlayerPledgeTotals', error, { contestId });
    throw new Error(`Failed to fetch pledges: ${error.message}`);
  }

  const totals: Record<string, { supporters: number; pledged: number }> = {};
  for (const pledge of data ?? []) {
    const most = Number(pledge.amount) * (pledge.kind === 'per_hit' ? pitchesPerPlayer : 1);
    const amount =
      pledge.amount_owed !== null
        ? Number(pledge.amount_owed)
        : pledge.cap !== null
          ? Math.min(most, Number(pledge.cap))
          : most;
    const total = (totals[pledge.player_id] ??= { supporters: 0, pledged: 0 });
    total.supporters += 1;
    total.pledged += amount;
  }

  return totals;
}
