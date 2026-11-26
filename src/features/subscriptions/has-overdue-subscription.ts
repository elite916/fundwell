import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

/**
 * Returns true if the given owner has a paid subscription that is past due or unpaid.
 * They don't have Pro (see hasActiveSubscription), but it's still open.
 */
export async function hasOverdueSubscription(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from('subscriptions')
    .select('id, prices!inner(unit_amount)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['past_due', 'unpaid'])
    .gt('prices.unit_amount', 0);

  return Boolean(count && count > 0);
}
