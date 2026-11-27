'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { DashButton, DashInput } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { SetupSection } from '@/components/studio/setup/section';
import { srOnly } from '@/components/studio/theme';
import { useToast } from '@/components/ui/use-toast';
import { deleteContest } from '@/features/contests/actions/delete-contest';
import { Database } from '@/libs/supabase/types';

import css from '@/components/studio/setup/setup.module.css';

type Contest = Database['public']['Tables']['contests']['Row'];

interface DangerZoneSectionProps {
  contest: Contest;
}

export function DangerZoneSection({ contest }: DangerZoneSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const isConfirmationValid = confirmationText.trim() === contest.name.trim();

  const handleDelete = () => {
    if (!isConfirmationValid) return;

    startTransition(async () => {
      const result = await deleteContest(contest.id);

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error.message,
        });
        return;
      }

      toast({
        title: 'Contest deleted',
        description: 'Your contest has been deleted.',
      });

      setIsDialogOpen(false);
      router.push('/dashboard');
    });
  };

  const handleOpenDialog = () => {
    setConfirmationText('');
    setIsDialogOpen(true);
  };

  const deleteWarning =
    contest.kind === 'hit_a_thon'
      ? 'Deleting a contest cannot be undone. Its players, pledges and supporter information will be deleted.'
      : 'Deleting a contest cannot be undone. Its squares and participant information will be deleted.';

  return (
    <SetupSection id='danger-zone' title='Danger Zone' description='Irreversible and destructive actions.'>
      <h3>Delete Contest</h3>
      <p className={`${css.soft} ${css.gapBottom}`}>{deleteWarning}</p>
      <DashButton look='quiet' onClick={handleOpenDialog}>
        Delete Contest
      </DashButton>

      {/* Confirmation Dialog */}
      <DashDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title='Delete Contest'
        description={deleteWarning}
      >
        <div className={css.scale}>
          <p className={css.confirm}>
            To confirm, type <b>{contest.name}</b> below:
          </p>
          <label htmlFor='confirmation' className={srOnly}>
            Contest name confirmation
          </label>
          <DashInput
            id='confirmation'
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder='Type contest name to confirm'
            autoComplete='off'
          />
        </div>

        <DashDialogFoot>
          <DashButton look='quiet' onClick={() => setIsDialogOpen(false)} disabled={isPending}>
            Cancel
          </DashButton>
          <BusyButton busy={isPending} look='danger' onClick={handleDelete} disabled={!isConfirmationValid}>
            Delete Contest
          </BusyButton>
        </DashDialogFoot>
      </DashDialog>
    </SetupSection>
  );
}
