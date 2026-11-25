import { requireAuth } from '@/features/contests/middleware/auth-middleware';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

/**
 * Whether the user is a Fundwell admin. Admins are listed in `public.admins`,
 * which has RLS on and no policies, so only the service role can read it.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdminClient
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  return !error && !!data;
}

/**
 * Throws unless the current user is signed in and is an admin.
 */
export async function requireAdmin() {
  const { user } = await requireAuth();

  if (!(await isAdmin(user.id))) {
    throw new Error('Admin access required');
  }

  return user;
}
