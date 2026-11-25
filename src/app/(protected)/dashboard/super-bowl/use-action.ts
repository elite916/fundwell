'use client';

import { useTransition } from 'react';

import { sayProblem } from '@/components/studio/dashboard/dash-toast';
import type { ActionResponse } from '@/types/action-response';

/** Runs a server action: whether it's under way, and what starts it. `onDone` runs only if it worked. */
export function useAction() {
  const [isPending, startTransition] = useTransition();

  const run = <T>(action: () => Promise<ActionResponse<T>>, onDone: (data: T) => void) => {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result || result.error) {
          sayProblem(result?.error.message ?? 'An unexpected error occurred');
          return;
        }
        onDone(result.data);
      } catch {
        sayProblem('An unexpected error occurred. Please try again.');
      }
    });
  };

  return [isPending, run] as const;
}
