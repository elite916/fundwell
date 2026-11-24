import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Database } from '@/libs/supabase/types';

type Contest = Database['public']['Tables']['contests']['Row'];

/**
 * Fetches a contest for public viewing. The access PIN isn't on this row; it
 * lives in the owner-only contest_pins table.
 */
export async function getPublicContestBySlug(slug: string): Promise<Contest | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Fetches a contest for owner viewing (includes all fields)
 */
export async function getOwnerContestById(contestId: string, userId: string): Promise<Contest | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('id', contestId)
    .eq('owner_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}