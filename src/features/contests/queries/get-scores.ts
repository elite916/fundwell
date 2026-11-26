import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Database } from '@/libs/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';

type Score = Database['public']['Tables']['scores']['Row'];

/**
 * Fetches all scores for a contest with winning square info.
 * Pass `client` to read with another client (the contest page passes the service role after its PIN check).
 */
export async function getScoresForContest(contestId: string, client?: SupabaseClient<Database>): Promise<Score[]> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data, error } = await supabase.from('scores').select('*').eq('contest_id', contestId).order('quarter');

  if (error) {
    throw new Error(`Failed to fetch scores: ${error.message}`);
  }

  return data ?? [];
}
