'use client';

import { useRef, useState } from 'react';
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

// Same words as Contest Status in Settings. A hit-a-thon starts only through "Lock and Send Totals" (release 5)
function getHitAThonButtonConfig(currentStatus: ContestStatus): ButtonConfig | null {
  switch (currentStatus) {
    case 'draft':
      return {
        label: 'Open Contest',
        description: 'This makes your hit-a-thon visible so supporters can pledge.',
        nextStatus: 'open',
      };
    case 'open':
      return {
        label: 'Close Pledges',
        description: "Supporters can't pledge after this. You can reopen it later.",
        nextStatus: 'locked',
      };
    case 'locked':
      return {
        label: 'Reopen Pledges',
        description: 'Supporters can pledge again.',
        nextStatus: 'open',
      };
    default:
      return getButtonConfig(currentStatus);
  }
}

interface ContestStatusButtonProps {
  contestId: string;
  currentStatus: ContestStatus;
  isHitAThon?: boolean;
  className?: string;
}

export function ContestStatusButton({ contestId, currentStatus, isHitAThon, className }: ContestStatusButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const isDoneRef = useRef(false);
  const router = useRouter();

  const config = isHitAThon ? getHitAThonButtonConfig(currentStatus) : getButtonConfig(currentStatus);

  if (!config) return null;

  async function handleStatusChange() {
    if (!config) return;

    setIsLoading(true);
    try {
      const result = await updateContestStatus(contestId, config.nextStatus);

      if (!result || result.error) {
        sayProblem(result?.error?.message ?? 'Failed to update contest status');
      } else {
        say(`Contest is now ${config.nextStatus.replace('_', ' ')}.`);
        isDoneRef.current = config.nextStatus === 'completed';
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
        // A completed contest has no button to go back to
        endFocus={() => (isDoneRef.current ? document.getElementById('quick-actions') : null)}
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
