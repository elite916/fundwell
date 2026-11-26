'use client';

import { type CSSProperties, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/studio/button';
import { Segmented, UnitField } from '@/components/studio/setup/fields';
import { Sheet } from '@/components/studio/sheet';
import { StatusText } from '@/components/studio/status-text';
import { TextField } from '@/components/studio/text-field';
import { Soft } from '@/components/studio/type';
import { pledge } from '@/features/contests/actions/pledge';
import type { PaymentOption } from '@/features/contests/types';
import { formatPrizeAmount } from '@/features/contests/utils';
import { type PledgeFormData, pledgeSchema } from '@/features/contests/validation';
import { zodResolver } from '@hookform/resolvers/zod';

import { PaymentOptionItem } from '../squares/payment-option-item';

import { mostLine, mostOwed, type PublicHitPlayer } from './model';

import css from './hit-a-thon.module.css';

interface PledgeSheetProps {
  contestId: string;
  player: PublicHitPlayer;
  pitchesPerPlayer: number;
  paymentOptions: PaymentOption[];
  colors: CSSProperties;
  onClose: () => void;
}

type Kind = PledgeFormData['kind'];

const KINDS = [
  { value: 'per_hit', label: 'Per hit' },
  { value: 'flat', label: 'Flat gift' },
] as const;

/** An empty field is no value, so "required" and "optional" read the same way to the schema. */
const asAmount = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);

/** A number the schema would accept, for the live "Most you'd pay" line. */
const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 10000;

/** Pledge to one player, per hit or a flat gift, then what happens next. */
export function PledgeSheet({
  contestId,
  player,
  pitchesPerPlayer,
  paymentOptions,
  colors,
  onClose,
}: PledgeSheetProps) {
  const router = useRouter();
  const [made, setMade] = useState<Pick<PledgeFormData, 'kind' | 'amount' | 'cap'> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<PledgeFormData>({
    resolver: zodResolver(pledgeSchema),
    defaultValues: {
      kind: 'per_hit',
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  const kind = watch('kind');
  const amount = watch('amount');
  const cap = watch('cap');
  const name = player.first_name;
  const title = `Pledge for ${name}`;

  const chooseKind = (next: Kind) => {
    setValue('kind', next);
    // A cap is for per-hit pledges only
    if (next === 'flat') setValue('cap', undefined);
    clearErrors(['amount', 'cap']);
  };

  const onSubmit = (data: PledgeFormData) => {
    setServerError('');

    startTransition(async () => {
      try {
        const result = await pledge({
          contestId,
          playerId: player.id,
          kind: data.kind,
          amount: data.amount,
          cap: data.kind === 'per_hit' ? data.cap : undefined,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
        });

        if (result?.error) {
          setServerError(result.error.message);
          return;
        }

        // Reload the totals
        setMade({ kind: data.kind, amount: data.amount, cap: data.kind === 'per_hit' ? data.cap : undefined });
        router.refresh();
      } catch {
        setServerError('An unexpected error occurred. Please try again.');
      }
    });
  };

  if (made?.kind === 'per_hit') {
    const most = formatPrizeAmount(mostOwed(made.amount, pitchesPerPlayer, made.cap));
    return (
      <Sheet
        open
        onOpenChange={onClose}
        step='made'
        style={colors}
        title='Pledge made. Thank you!'
        description={`${formatPrizeAmount(made.amount)} a hit for ${name}, up to ${most}. After the event, we'll email your total and how to pay.`}
        footer={<Button onClick={onClose}>Done</Button>}
      />
    );
  }

  if (made) {
    return (
      <Sheet
        open
        onOpenChange={onClose}
        step='made'
        style={colors}
        title='Pledge made. Complete your payment'
        description={`${formatPrizeAmount(made.amount)} for ${name}. Pending until the organizer marks it paid.`}
        footer={<Button onClick={onClose}>Done</Button>}
      >
        {paymentOptions.length > 0 ? (
          <ul>
            {paymentOptions.map((option) => (
              <PaymentOptionItem key={option.id} option={option} />
            ))}
          </ul>
        ) : (
          <p>Contact the contest organizer for payment instructions.</p>
        )}
        <Soft className={css.later}>Not now? We&apos;ll email you after the event.</Soft>
      </Sheet>
    );
  }

  return (
    <Sheet open onOpenChange={onClose} step='pledge' style={colors} title={title}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className={css.form}>
        <Segmented<Kind> legend={title} name='kind' value={kind} onChange={chooseKind} options={KINDS} />
        <UnitField
          label={kind === 'per_hit' ? 'Amount per hit' : 'Amount'}
          unit='$'
          min='1'
          step='0.01'
          inputMode='decimal'
          placeholder={kind === 'per_hit' ? '5' : undefined}
          error={errors.amount?.message}
          {...register('amount', { setValueAs: asAmount })}
        />
        {kind === 'per_hit' && (
          <>
            <UnitField
              label={
                <>
                  Cap <span>(optional)</span>
                </>
              }
              unit='$'
              min='1'
              step='0.01'
              inputMode='decimal'
              hint="The most you'll pay, whatever the hits."
              error={errors.cap?.message}
              {...register('cap', { setValueAs: asAmount })}
            />
            <StatusText live tone='soft' className={css.most}>
              {isAmount(amount)
                ? mostLine(amount, pitchesPerPlayer, isAmount(cap) && cap >= amount ? cap : undefined)
                : null}
            </StatusText>
          </>
        )}
        <TextField
          label='First name'
          autoComplete='given-name'
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <TextField
          label='Last name'
          autoComplete='family-name'
          error={errors.lastName?.message}
          {...register('lastName')}
        />
        <TextField
          label='Email'
          type='email'
          autoComplete='email'
          error={errors.email?.message}
          {...register('email')}
        />
        <p role='alert' className={css.alert}>
          {serverError}
        </p>
        <div className={css.submit}>
          <Button type='submit' pending={isPending}>
            {isPending ? 'Pledging...' : 'Pledge'}
          </Button>
          <Soft small className={css.note}>
            {kind === 'per_hit'
              ? 'You pay the organizer directly after the event. Fundwell never charges your card.'
              : 'Pay the organizer now or after the event. Fundwell never charges your card.'}
          </Soft>
        </div>
      </form>
    </Sheet>
  );
}
