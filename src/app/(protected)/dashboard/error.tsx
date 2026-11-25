'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { DashPage, DashProblem } from '@/components/studio/dashboard/dash-page';
import { logger } from '@/utils/logger';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error('dashboard-error', error, { digest: error.digest });
  }, [error]);

  return (
    <DashPage>
      <DashProblem
        title='Something went wrong'
        text='We encountered an unexpected error. Please try again or contact support if the problem persists.'
        fine={error.digest && `Error ID: ${error.digest}`}
      >
        <DashButton onClick={reset}>Try Again</DashButton>
        <DashButton asChild look='quiet'>
          <Link href='/dashboard'>Back to Dashboard</Link>
        </DashButton>
      </DashProblem>
    </DashPage>
  );
}
