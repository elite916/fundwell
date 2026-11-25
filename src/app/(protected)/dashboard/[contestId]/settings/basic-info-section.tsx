'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { BusyButton } from '@/components/studio/setup/busy-button';
import { TextArea } from '@/components/studio/setup/fields';
import { SetupSection } from '@/components/studio/setup/section';
import { TextField } from '@/components/studio/text-field';
import { useToast } from '@/components/ui/use-toast';
import { updateContest } from '@/features/contests/actions/update-contest';
import { Database } from '@/libs/supabase/types';
import { zodResolver } from '@hookform/resolvers/zod';

import css from '@/components/studio/setup/setup.module.css';

type Contest = Database['public']['Tables']['contests']['Row'];

const basicInfoSchema = z.object({
  name: z.string().min(1, 'Contest name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  row_team_name: z.string().min(1, 'Row team name is required').max(50, 'Name is too long'),
  col_team_name: z.string().min(1, 'Column team name is required').max(50, 'Name is too long'),
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

interface BasicInfoSectionProps {
  contest: Contest;
}

const SPORT_TYPE_LABELS: Record<string, string> = {
  football: 'Football',
  baseball: 'Baseball',
};

export function BasicInfoSection({ contest }: BasicInfoSectionProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: contest.name,
      description: contest.description ?? '',
      row_team_name: contest.row_team_name,
      col_team_name: contest.col_team_name,
    },
  });

  const onSubmit = (data: BasicInfoFormData) => {
    startTransition(async () => {
      const result = await updateContest(contest.id, {
        name: data.name,
        description: data.description || null,
        row_team_name: data.row_team_name,
        col_team_name: data.col_team_name,
      });

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error.message,
        });
        return;
      }

      toast({
        title: 'Settings saved',
        description: 'Your contest settings have been updated.',
      });
    });
  };

  return (
    <SetupSection
      id='basic-information'
      title='Basic Information'
      description='Update your contest name, description, and team names.'
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          id='name'
          label='Contest Name'
          placeholder='Super Bowl Squares 2025'
          autoComplete='off'
          error={errors.name?.message}
          {...register('name')}
        />

        <TextArea
          id='description'
          label='Description (optional)'
          placeholder='Enter a description for your contest...'
          error={errors.description?.message}
          {...register('description')}
        />

        {/* Sport Type (read-only) */}
        <p className={css.label}>Sport Type</p>
        <p className={css.gapBottom}>
          {SPORT_TYPE_LABELS[contest.sport_type] || contest.sport_type}{' '}
          <span className={css.soft}>(Cannot be changed after creation)</span>
        </p>

        <div className={css.two}>
          <TextField
            id='row_team_name'
            label='Row Team Name'
            placeholder='Kansas City Chiefs'
            autoComplete='off'
            error={errors.row_team_name?.message}
            {...register('row_team_name')}
          />
          <TextField
            id='col_team_name'
            label='Column Team Name'
            placeholder='San Francisco 49ers'
            autoComplete='off'
            error={errors.col_team_name?.message}
            {...register('col_team_name')}
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
