import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Database } from '@/libs/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';

type PaymentOption = Database['public']['Tables']['payment_options']['Row'];

/**
 * Fetches all payment options for a contest, ordered by sort_order.
 * Pass `client` to read with another client (the contest page passes the service role after its PIN check).
 */
export async function getPaymentOptionsForContest(
  contestId: string,
  client?: SupabaseClient<Database>
): Promise<PaymentOption[]> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase
    .from('payment_options')
    .select('*')
    .eq('contest_id', contestId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch payment options: ${error.message}`);
  }

  return data ?? [];
}
