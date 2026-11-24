import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Database } from '@/libs/supabase/types';

type Contest = Database['public']['Tables']['contests']['Row'];

/**
 * Fetches a contest by ID for dashboard/owner views.
 * Returns null unless the signed-in user owns the contest. RLS alone isn't
 * enough: any signed-in user can read public contests.
 */
export async function getContestById(contestId: string): Promise<Contest | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('id', contestId)
    .eq('owner_id', user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Fetches only the access_pin for PIN verification
 */
export async function getContestPin(slug: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from('contests').select('access_pin').eq('slug', slug).single();

  if (error || !data) {
    return null;
  }

  return data.access_pin;
}
