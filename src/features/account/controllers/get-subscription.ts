import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { logger } from '@/utils/logger';

/**
 * The subscription to show in billing. If there are several: a paid one first, then
 * active or trialing, then the newest. The Stripe portal manages all of them.
 */
export async function getSubscription() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active', 'past_due', 'unpaid'])
    .order('created', { ascending: false });

  if (error) {
    logger.error('get-subscription', error);
  }

  const subscriptions = data ?? [];
  const paid = subscriptions.filter(({ prices }) => (prices?.unit_amount ?? 0) > 0);
  const candidates = paid.length > 0 ? paid : subscriptions;

  return candidates.find(({ status }) => status === 'active' || status === 'trialing') ?? candidates[0] ?? null;
}
