'use client';

import { useEffect } from 'react';

import { Button } from '@/components/studio/button';
import { TextLink } from '@/components/studio/text-link';
import * as Sentry from '@sentry/nextjs';

import { ContestMessage } from './contest-message';

interface ContestErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ContestError({ error, reset }: ContestErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ContestMessage
      title='Unable to Load Contest'
      action={
        <>
          <Button onClick={reset}>Try Again</Button>
          <TextLink href='/'>Go Home</TextLink>
        </>
      }
      note={error.digest && `Error ID: ${error.digest}`}
    >
      We couldn&apos;t load this contest. It may have been removed or there was a temporary issue.
    </ContestMessage>
  );
}
