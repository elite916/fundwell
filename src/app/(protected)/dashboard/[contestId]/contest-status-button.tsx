'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import { Database } from '@/libs/supabase/types';

import { updateContestStatus } from './actions';

type ContestStatus = Database['public']['Enums']['contest_status'];

interface ButtonConfig {
  label: string;
  description: string;
  nextStatus: ContestStatus;
}

// Same words as Contest Status in Settings
function getButtonConfig(currentStatus: ContestStatus): ButtonConfig | null {
  switch (currentStatus) {
    case 'draft':
      return {
        label: 'Open Contest',
        description: 'This will make your contest visible to participants and allow them to claim squares.',
        nextStatus: 'open',
      };
    case 'open':
      return {
        label: 'Lock Contest',
        description: 'This will prevent participants from claiming new squares. You can reopen it later.',
        nextStatus: 'locked',
      };
    case 'locked':
      return {
        label: 'Start Game',
        description: 'This indicates the game has started. You can begin entering scores.',
        nextStatus: 'in_progress',
      };
    case 'in_progress':
      return {
        label: 'Complete Contest',
        description: 'This will mark the contest as finished. This action cannot be undone.',
        nextStatus: 'completed',
      };
    default:
      return null;
  }
}

interface ContestStatusButtonProps {
  contestId: string;
  currentStatus: ContestStatus;
  className?: string;
}

export function ContestStatusButton({ contestId, currentStatus, className }: ContestStatusButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const router = useRouter();

  const config = getButtonConfig(currentStatus);

  if (!config) return null;

  async function handleStatusChange() {
    if (!config) return;

    setIsLoading(true);
    try {
      const result = await updateContestStatus(contestId, config.nextStatus);

      if (!result || result.error) {
        sayProblem(result?.error?.message ?? 'Failed to update contest status');
      } else {
        say(`Contest status changed to ${config.nextStatus}.`);
        router.refresh();
      }
    } catch (error) {
      sayProblem('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      setIsConfirming(false);
    }
  }

  return (
    <>
      <DashButton
        look={currentStatus === 'in_progress' ? 'quiet' : 'main'}
        onClick={() => setIsConfirming(true)}
        disabled={isLoading}
        className={className}
      >
        {config.label}
      </DashButton>

      <DashDialog
        open={isConfirming}
        onClose={() => setIsConfirming(false)}
        title='Confirm Status Change'
        description={config.description}
      >
        <DashDialogFoot>
          <DashButton look='quiet' onClick={() => setIsConfirming(false)} disabled={isLoading}>
            Cancel
          </DashButton>
          <DashButton onClick={handleStatusChange} disabled={isLoading}>
            {isLoading ? 'Updating...' : config.label}
          </DashButton>
        </DashDialogFoot>
      </DashDialog>
    </>
  );
}
