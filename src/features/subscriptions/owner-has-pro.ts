import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

/**
 * Whether a contest owner has Pro, for pages viewed by other people.
 * Uses public.owner_has_pro (service role only), because RLS hides other users'
 * subscriptions. Returns false on error, so ads show. Not a server action.
 */
export async function ownerHasPro(ownerId: string): Promise<boolean> {
  const { data, error } = await supabaseAdminClient.rpc('owner_has_pro', { uid: ownerId });

  return !error && data === true;
}
