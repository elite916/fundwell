import { type HitPlayer, sortHitPlayers } from '@/features/contests/utils/hit-players';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Database } from '@/libs/supabase/types';
import { logger } from '@/utils/logger';

type PledgeRow = Database['public']['Tables']['pledges']['Row'];

export type HitPlayerWithHits = HitPlayer & { hits: number | null };

export type OwnerPledge = Pick<
  PledgeRow,
  'id' | 'player_id' | 'kind' | 'amount' | 'cap' | 'amount_owed' | 'status' | 'created_at'
> & {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

/** A hit-a-thon's players with their hit counts, for the owner's overview and pledges list. */
export async function getHitPlayersWithHits(contestId: string): Promise<HitPlayerWithHits[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('hit_players')
    .select('id, first_name, number, slug, hits')
    .eq('contest_id', contestId);

  if (error) {
    logger.error('getHitPlayersWithHits', error, { contestId });
    throw new Error(`Failed to fetch players: ${error.message}`);
  }

  return sortHitPlayers(data ?? []);
}

/**
 * A hit-a-thon's pledges, newest first, cancelled ones left out (like released squares), with each supporter's name
 * and email. Those live in pledge_contacts, which only the contest owner can read.
 */
export async function getPledgesForOwner(contestId: string): Promise<OwnerPledge[]> {
  const supabase = await createSupabaseServerClient();

  // Two reads: pledge_contacts has two foreign keys to pledges, so an embed would be ambiguous
  const [pledges, contacts] = await Promise.all([
    supabase
      .from('pledges')
      .select('id, player_id, kind, amount, cap, amount_owed, status, created_at')
      .eq('contest_id', contestId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    supabase.from('pledge_contacts').select('pledge_id, first_name, last_name, email').eq('contest_id', contestId),
  ]);

  const error = pledges.error ?? contacts.error;
  if (error) {
    logger.error('getPledgesForOwner', error, { contestId });
    throw new Error(`Failed to fetch pledges: ${error.message}`);
  }

  const contactsById = new Map((contacts.data ?? []).map((c) => [c.pledge_id, c]));
  return (pledges.data ?? []).map((pledge) => {
    const contact = contactsById.get(pledge.id);
    return {
      ...pledge,
      first_name: contact?.first_name ?? null,
      last_name: contact?.last_name ?? null,
      email: contact?.email ?? null,
    };
  });
}
