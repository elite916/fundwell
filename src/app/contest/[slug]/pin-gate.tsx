'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/studio/button';
import { TextField } from '@/components/studio/text-field';
import { TextLink } from '@/components/studio/text-link';
import { Display } from '@/components/studio/type';
import { verifyPin } from '@/features/contests/actions/verify-pin';
import { zodResolver } from '@hookform/resolvers/zod';

import css from './contest.module.css';

const pinSchema = z.object({
  pin: z
    .string()
    .min(1, 'PIN is required')
    .max(6, 'PIN must be 6 characters or less')
    .regex(/^[A-Za-z0-9]+$/, 'PIN must be alphanumeric'),
});

type PinFormData = z.infer<typeof pinSchema>;

/** All a visitor gets of a private contest until they enter its PIN. */
export function PinGate({ contestSlug }: { contestSlug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PinFormData>({ resolver: zodResolver(pinSchema), defaultValues: { pin: '' } });

  const onSubmit = ({ pin }: PinFormData) => {
    setServerError('');
    startTransition(async () => {
      try {
        const result = await verifyPin({ contestSlug, enteredPin: pin });
        if (result.error) {
          setServerError(result.error.message);
        } else if (result.data?.success) {
          // The server now sees the access cookie
          startTransition(() => router.refresh());
        }
      } catch {
        setServerError('An unexpected error occurred. Please try again.');
      }
    });
  };

  return (
    <div className={css.gate}>
      <Display className={css.gateTitle}>
        This contest
        <br />
        is private
      </Display>
      <div className={css.gateForm}>
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label='Enter PIN to continue'
            maxLength={6}
            autoComplete='off'
            autoFocus
            autoCapitalize='characters'
            spellCheck={false}
            className={css.pin}
            error={errors.pin?.message}
            {...register('pin')}
          />
          <p role='alert' className={css.alert}>
            {serverError}
          </p>
          <div className={css.actions}>
            <Button type='submit' pending={isPending}>
              {isPending ? 'Verifying...' : 'Enter Contest'}
            </Button>
            <TextLink href='/'>Back to home</TextLink>
          </div>
        </form>
      </div>
    </div>
  );
}
