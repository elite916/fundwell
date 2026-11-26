'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

// Several quarters can be saved at once
const REFRESH_DELAY_MS = 300;

/**
 * Reloads the page's data when a score changes, and when a tab that may have missed one comes back.
 * With `realtime` off, only on tab return.
 */
export function useRefreshOnScores(contestId: string, realtime = true) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    const supabase = realtime ? createSupabaseBrowserClient() : null;
    const channel = supabase
      ?.channel(`scores:${contestId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `contest_id=eq.${contestId}` },
        refresh
      )
      .subscribe();
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [contestId, realtime, router]);
}
