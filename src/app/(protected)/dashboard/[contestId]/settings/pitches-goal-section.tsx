'use client';

import { useTransition } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';

import { BusyButton } from '@/components/studio/setup/busy-button';
import { UnitField } from '@/components/studio/setup/fields';
import { SetupSection } from '@/components/studio/setup/section';
import { TextField } from '@/components/studio/text-field';
import { useToast } from '@/components/ui/use-toast';
import { updateContest } from '@/features/contests/actions/update-contest';
import { hitAThonSettingsSchema } from '@/features/contests/models/contest';
import { Database } from '@/libs/supabase/types';
import { zodResolver } from '@hookform/resolvers/zod';

import css from '@/components/studio/setup/setup.module.css';

type Contest = Database['public']['Tables']['contests']['Row'];
type PitchesGoalFormData = z.infer<typeof hitAThonSettingsSchema>;

/** A hit-a-thon's pitches per player and goal per player, in place of squares' pricing and payouts. */
export function PitchesGoalSection({ contest }: { contest: Contest }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PitchesGoalFormData>({
    resolver: zodResolver(hitAThonSettingsSchema) as Resolver<PitchesGoalFormData>,
    defaultValues: {
      pitchesPerPlayer: contest.pitches_per_player ?? undefined,
      playerGoal: contest.player_goal,
    },
  });

  const onSubmit = (data: PitchesGoalFormData) => {
    startTransition(async () => {
      const result = await updateContest(contest.id, {
        pitches_per_player: data.pitchesPerPlayer,
        player_goal: data.playerGoal,
      });

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error.message,
        });
        return;
      }

      reset(data);
      toast({
        title: 'Settings saved',
        description: 'Your contest settings have been updated.',
      });
    });
  };

  return (
    <SetupSection id='pitches-goal' title='Pitches and goal'>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={css.two}>
          <TextField
            id='pitches_per_player'
            label='Pitches per player *'
            type='number'
            min='1'
            max='100'
            step='1'
            placeholder='10'
            hint="A player can't get more hits than this. Supporters see the most they could owe."
            error={errors.pitchesPerPlayer?.message}
            {...register('pitchesPerPlayer')}
          />
          <UnitField
            id='player_goal'
            label='Goal per player'
            unit='$'
            min='1'
            step='1'
            placeholder='No goal'
            hint="Optional. Shown on each player's page. The team goal is this times the number of players."
            error={errors.playerGoal?.message}
            {...register('playerGoal')}
          />
        </div>

        <div className={css.save}>
          <BusyButton busy={isPending} type='submit' disabled={!isDirty}>
            Save Changes
          </BusyButton>
        </div>
      </form>
    </SetupSection>
  );
}
