import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

/**
 * Returns true if the given owner has an active or trialing paid subscription.
 * The $0 Free price doesn't count. Matches public.owner_has_pro in the database.
 */
export async function hasActiveSubscription(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from('subscriptions')
    .select('id, prices!inner(unit_amount)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .gt('prices.unit_amount', 0);

  return Boolean(count && count > 0);
}
