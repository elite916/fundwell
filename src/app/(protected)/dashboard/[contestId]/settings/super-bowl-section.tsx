'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { SwitchRow } from '@/components/studio/setup/fields';
import { SetupSection } from '@/components/studio/setup/section';
import { useToast } from '@/components/ui/use-toast';
import { updateContest } from '@/features/contests/actions/update-contest';
import { Database } from '@/libs/supabase/types';

type Contest = Database['public']['Tables']['contests']['Row'];

interface SuperBowlSectionProps {
  contest: Contest;
}

export function SuperBowlSection({ contest }: SuperBowlSectionProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  // Only show for football contests
  if (contest.sport_type !== 'football') return null;

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      const result = await updateContest(contest.id, { is_super_bowl: checked });
      if (result?.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error.message });
      } else {
        toast({
          title: checked ? 'Super Bowl tracking enabled' : 'Super Bowl tracking disabled',
          description: checked
            ? 'This contest will be included in automated score tracking.'
            : 'This contest will no longer be tracked automatically.',
        });
        router.refresh();
      }
    });
  }

  const isTracked = (contest as Contest & { is_super_bowl?: boolean }).is_super_bowl || false;

  return (
    <SetupSection
      id='super-bowl-automation'
      title='Super Bowl Automation'
      description='Enable automated score tracking for this contest during the Super Bowl. Scores will be fetched from ESPN, winners determined automatically, and notification emails sent.'
    >
      <SwitchRow
        id='is_super_bowl'
        label='Automated Score Tracking'
        hint={
          isTracked ? 'Scores will be tracked automatically on game day' : 'Enable to include in Super Bowl automation'
        }
        checked={isTracked}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
    </SetupSection>
  );
}
