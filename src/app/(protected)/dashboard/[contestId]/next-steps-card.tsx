import Link from 'next/link';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { Database } from '@/libs/supabase/types';

import css from './run.module.css';

type ContestStatus = Database['public']['Enums']['contest_status'];

type NextStepInfo = {
  message: string;
  actionLink: string | null;
} | null;

function getNextStep(
  status: ContestStatus,
  hasPaymentOptions: boolean,
  hasNumbers: boolean,
  contestId: string
): NextStepInfo {
  if (status === 'in_progress' || status === 'completed') return null;

  if (status === 'draft') {
    return !hasPaymentOptions
      ? {
          message: 'Add payment options so participants can pay for their squares',
          actionLink: `/dashboard/${contestId}/settings`,
        }
      : { message: 'Open your contest to allow participants to claim squares', actionLink: null };
  }

  if (status === 'open') {
    return !hasNumbers
      ? { message: 'Enter numbers or shuffle them', actionLink: null }
      : { message: 'Lock the contest to prevent new claims and prepare for game day', actionLink: null };
  }

  if (status === 'locked') {
    return !hasNumbers
      ? { message: 'Enter numbers before starting the game', actionLink: null }
      : { message: 'Start the game to begin tracking scores', actionLink: null };
  }

  return null;
}

interface NextStepsCardProps {
  contestId: string;
  status: ContestStatus;
  hasPaymentOptions: boolean;
  hasNumbers: boolean;
}

export function NextStepsCard({ contestId, status, hasPaymentOptions, hasNumbers }: NextStepsCardProps) {
  const nextStep = getNextStep(status, hasPaymentOptions, hasNumbers, contestId);

  if (!nextStep) return null;

  return (
    <div className={css.next}>
      <i aria-hidden='true' />
      <div>
        <h2>Next Step</h2>
        <p>{nextStep.message}</p>
      </div>
      {nextStep.actionLink && (
        <DashButton asChild look='light'>
          <Link href={nextStep.actionLink}>Go to Settings</Link>
        </DashButton>
      )}
    </div>
  );
}
