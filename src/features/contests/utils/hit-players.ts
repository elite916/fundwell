import { Database } from '@/libs/supabase/types';

export type HitPlayer = Pick<Database['public']['Tables']['hit_players']['Row'], 'id' | 'first_name' | 'number' | 'slug'>;

/** By number, then first name; players without a number last. Never by amount. */
export function sortHitPlayers<T extends Pick<HitPlayer, 'first_name' | 'number'>>(players: T[]): T[] {
  return [...players].sort(
    (a, b) =>
      (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER) ||
      a.first_name.localeCompare(b.first_name)
  );
}
