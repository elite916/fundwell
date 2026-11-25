'use client';

import { useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { BusyButton } from '@/components/studio/setup/busy-button';
import { PinField, SwitchRow } from '@/components/studio/setup/fields';
import { SetupSection } from '@/components/studio/setup/section';
import { useToast } from '@/components/ui/use-toast';
import { updateContest } from '@/features/contests/actions/update-contest';
import { updateContestPin } from '@/features/contests/actions/update-contest-pin';
import { Database } from '@/libs/supabase/types';
import { zodResolver } from '@hookform/resolvers/zod';

import css from '@/components/studio/setup/setup.module.css';

type Contest = Database['public']['Tables']['contests']['Row'];

const accessControlSchema = z
  .object({
    is_public: z.boolean(),
    require_pin: z.boolean(),
    access_pin: z
      .string()
      .max(6, 'PIN must be 6 characters or less')
      .regex(/^[A-Za-z0-9]*$/, 'PIN must be alphanumeric')
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.require_pin && (!data.access_pin || data.access_pin.length === 0)) {
        return false;
      }
      return true;
    },
    { message: 'PIN is required when PIN access is enabled', path: ['access_pin'] }
  );

type AccessControlFormData = z.infer<typeof accessControlSchema>;

interface AccessControlSectionProps {
  contest: Contest;
  accessPin: string | null;
}

function generatePin(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return pin;
}

export function AccessControlSection({ contest, accessPin }: AccessControlSectionProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<AccessControlFormData>({
    resolver: zodResolver(accessControlSchema),
    defaultValues: {
      is_public: contest.is_public,
      require_pin: !!accessPin,
      access_pin: accessPin ?? '',
    },
  });

  const requirePin = watch('require_pin');

  const handleGeneratePin = () => {
    const newPin = generatePin();
    setValue('access_pin', newPin, { shouldDirty: true });
  };

  const onSubmit = (data: AccessControlFormData) => {
    startTransition(async () => {
      const pinResult = await updateContestPin(contest.id, data.require_pin ? (data.access_pin ?? null) : null);
      const result = pinResult?.error
        ? pinResult
        : await updateContest(contest.id, {
            is_public: data.is_public,
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
        description: 'Access control settings have been updated.',
      });
    });
  };

  return (
    <SetupSection
      id='access-control'
      title='Access Control'
      description='Control who can view and access your contest.'
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Public Visibility */}
        <Controller
          name='is_public'
          control={control}
          render={({ field }) => (
            <SwitchRow
              id='is_public'
              label='Make contest public'
              hint='When enabled, anyone with the link can view the contest'
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />

        {/* Require PIN */}
        <Controller
          name='require_pin'
          control={control}
          render={({ field }) => (
            <SwitchRow
              id='require_pin'
              label='Require PIN to access'
              hint='When enabled, participants must enter a PIN to view your contest'
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />

        {/* Access PIN Input */}
        {requirePin && (
          <div className={css.gapTopSmall}>
            <PinField
              id='access_pin'
              hint='6 characters max, letters and numbers only'
              error={errors.access_pin?.message}
              onGenerate={handleGeneratePin}
              {...register('access_pin')}
            />
          </div>
        )}

        {/* Submit Button */}
        <div className={css.save}>
          <BusyButton busy={isPending} type='submit' disabled={!isDirty}>
            Save Changes
          </BusyButton>
        </div>
      </form>
    </SetupSection>
  );
}
