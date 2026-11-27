'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { Tag } from '@/components/studio/dashboard/dash-page';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { SetupSection } from '@/components/studio/setup/section';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/libs/supabase/types';

import { updateContestStatus } from '../actions';

import css from '@/components/studio/setup/setup.module.css';

type Contest = Database['public']['Tables']['contests']['Row'];
type ContestStatus = Database['public']['Enums']['contest_status'];

const STATUS_CONFIG: Record<
  ContestStatus,
  {
    label: string;
    description: string;
  }
> = {
  draft: {
    label: 'Draft',
    description: 'Contest is not visible to participants',
  },
  open: {
    label: 'Open',
    description: 'Participants can claim squares',
  },
  locked: {
    label: 'Locked',
    description: 'Square claiming is paused',
  },
  in_progress: {
    label: 'In progress',
    description: 'Game is being played, scores can be entered',
  },
  completed: {
    label: 'Completed',
    description: 'Contest has ended, winners determined',
  },
};

// Figma's Status chip for each status. The rest are Open's look.
const STATUS_TONES: Partial<Record<ContestStatus, 'now' | 'locked'>> = {
  locked: 'locked',
  in_progress: 'now',
};

interface StatusTransition {
  targetStatus: ContestStatus;
  label: string;
  description: string;
}

const STATUS_TRANSITIONS: Record<ContestStatus, StatusTransition[]> = {
  draft: [
    {
      targetStatus: 'open',
      label: 'Open Contest',
      description: 'This will make your contest visible to participants and allow them to claim squares.',
    },
  ],
  open: [
    {
      targetStatus: 'locked',
      label: 'Lock Contest',
      description: 'This will prevent participants from claiming new squares. You can reopen it later.',
    },
  ],
  locked: [
    {
      targetStatus: 'open',
      label: 'Reopen Contest',
      description: 'This will allow participants to claim squares again.',
    },
    {
      targetStatus: 'in_progress',
      label: 'Start Game',
      description: 'This indicates the game has started. You can begin entering scores.',
    },
  ],
  in_progress: [
    {
      targetStatus: 'completed',
      label: 'Complete Contest',
      description: 'This will mark the contest as finished. This action cannot be undone.',
    },
  ],
  completed: [],
};

// A hit-a-thon starts only through "Lock and Send Totals" (release 4), so there's no Start Game
const HIT_A_THON_TRANSITIONS: Record<ContestStatus, StatusTransition[]> = {
  draft: [
    {
      targetStatus: 'open',
      label: 'Open Contest',
      description: 'This makes your hit-a-thon visible so supporters can pledge.',
    },
  ],
  open: [
    {
      targetStatus: 'locked',
      label: 'Close Pledges',
      description: "Supporters can't pledge after this. You can reopen it later.",
    },
  ],
  locked: [
    {
      targetStatus: 'open',
      label: 'Reopen Pledges',
      description: 'Supporters can pledge again.',
    },
  ],
  in_progress: STATUS_TRANSITIONS.in_progress,
  completed: [],
};

interface ContestStatusSectionProps {
  contest: Contest;
}

export function ContestStatusSection({ contest }: ContestStatusSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState<StatusTransition | null>(null);
  const isDoneRef = useRef(false);
  const router = useRouter();
  const { toast } = useToast();

  const currentStatus = contest.status as ContestStatus;
  const statusConfig = STATUS_CONFIG[currentStatus];
  const isHitAThon = contest.kind === 'hit_a_thon';
  const availableTransitions = (isHitAThon ? HIT_A_THON_TRANSITIONS : STATUS_TRANSITIONS)[currentStatus];

  const handleTransition = (transition: StatusTransition) => {
    isDoneRef.current = false;
    setConfirmDialog(transition);
  };

  const confirmTransition = () => {
    if (!confirmDialog) return;

    startTransition(async () => {
      const result = await updateContestStatus(contest.id, confirmDialog.targetStatus);

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error.message,
        });
        setConfirmDialog(null);
        return;
      }

      toast({
        title: 'Status updated',
        description: `Contest is now ${STATUS_CONFIG[confirmDialog.targetStatus].label.toLowerCase()}.`,
      });

      isDoneRef.current = true;
      setConfirmDialog(null);
      router.refresh();
    });
  };

  return (
    <SetupSection id='contest-status' title='Contest Status' description='Manage your contest lifecycle.'>
      {/* Current Status */}
      <p className={`${css.row} ${css.statusRow}`}>
        <Tag tone={STATUS_TONES[currentStatus] ?? 'quiet'}>{statusConfig.label}</Tag>
        {/* The descriptions are about squares */}
        {!isHitAThon && <span>{statusConfig.description}</span>}
      </p>

      {/* Available Transitions */}
      {availableTransitions.length > 0 ? (
        <>
          <p className={`${css.label} ${css.gapTopSmall}`}>Available Actions</p>
          <div className={css.row}>
            {availableTransitions.map((transition) => (
              <DashButton
                key={transition.targetStatus}
                look='quiet'
                onClick={() => handleTransition(transition)}
                disabled={isPending}
              >
                {transition.label}
              </DashButton>
            ))}
          </div>
        </>
      ) : (
        <p className={css.soft}>This contest has ended. No further status changes are available.</p>
      )}

      {/* Confirmation Dialog */}
      <DashDialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        title='Confirm Status Change'
        description={confirmDialog?.description}
        // The new status has other buttons
        endFocus={() => (isDoneRef.current ? document.getElementById('contest-status-title') : null)}
      >
        <DashDialogFoot>
          <DashButton look='quiet' onClick={() => setConfirmDialog(null)} disabled={isPending}>
            Cancel
          </DashButton>
          <BusyButton busy={isPending} onClick={confirmTransition}>
            {confirmDialog?.label}
          </BusyButton>
        </DashDialogFoot>
      </DashDialog>
    </SetupSection>
  );
}
