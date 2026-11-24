import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
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
 * Fetches a contest's access PIN for PIN verification (server only).
 * PINs live in contest_pins, which only owners can read, so this uses the
 * service role. Never send the result to a non-owner.
 */
export async function getContestPin(slug: string): Promise<string | null> {
  const { data, error } = await supabaseAdminClient
    .from('contests')
    .select('contest_pins(pin)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return firstPin(data.contest_pins);
}

/**
 * Fetches the PIN of a contest the signed-in user owns (RLS: owners only).
 */
export async function getContestPinForOwner(contestId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase.from('contest_pins').select('pin').eq('contest_id', contestId).maybeSingle();

  return data?.pin ?? null;
}

function firstPin(pins: { pin: string } | { pin: string }[] | null): string | null {
  if (!pins) return null;
  if (Array.isArray(pins)) return pins[0]?.pin ?? null;
  return pins.pin;
}
