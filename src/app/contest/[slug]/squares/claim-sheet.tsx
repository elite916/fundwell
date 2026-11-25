'use client';

import { type CSSProperties, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/studio/button';
import type { GridSquare } from '@/components/studio/grid/model';
import { TileChip } from '@/components/studio/grid/tile';
import { Select } from '@/components/studio/select';
import { Sheet } from '@/components/studio/sheet';
import { TextField } from '@/components/studio/text-field';
import { claimSquare } from '@/features/contests/actions/claim-square';
import type { PaymentOption, Player } from '@/features/contests/types';
import { formatPrizeAmount } from '@/features/contests/utils';
import { type ClaimSquareFormData, claimSquareSchema } from '@/features/contests/validation';
import { zodResolver } from '@hookform/resolvers/zod';

import { PaymentOptionItem } from './payment-option-item';

import css from './squares.module.css';

interface ClaimSheetProps {
  square: GridSquare;
  contestId: string;
  squarePrice: number;
  paymentOptions: PaymentOption[];
  /** Null when the contest doesn't track who sent people. */
  players: Player[] | null;
  /** The player whose link brought this visitor. */
  referredBy: Player | null;
  colors: CSSProperties;
  onClose: () => void;
}

/** Claim a square, then how to pay for it. */
export function ClaimSheet({
  square,
  contestId,
  squarePrice,
  paymentOptions,
  players,
  referredBy,
  colors,
  onClose,
}: ClaimSheetProps) {
  const [isClaimed, setIsClaimed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClaimSquareFormData>({
    resolver: zodResolver(claimSquareSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      venmoHandle: '',
      referredBySlug: referredBy?.slug || '',
    },
  });

  const onSubmit = (data: ClaimSquareFormData) => {
    setServerError('');

    startTransition(async () => {
      try {
        const result = await claimSquare({
          squareId: square.id,
          contestId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          venmoHandle: data.venmoHandle,
          referredBySlug: referredBy?.slug || data.referredBySlug || undefined,
        });

        if (result?.error) {
          setServerError(result.error.message);
          return;
        }

        // The board updates itself over realtime
        setIsClaimed(true);
      } catch {
        setServerError('An unexpected error occurred. Please try again.');
      }
    });
  };

  const spot = `Row ${square.row_index + 1}, column ${square.col_index + 1}, ${formatPrizeAmount(Number(squarePrice))}`;

  if (isClaimed) {
    return (
      <Sheet
        open
        onOpenChange={onClose}
        step='claimed'
        style={colors}
        title='Square claimed. Complete your payment'
        description={`${spot}. Pending until the organizer marks it paid.`}
        footer={<Button onClick={onClose}>Done</Button>}
      >
        {paymentOptions.length > 0 ? (
          <ul className={css.payments}>
            {paymentOptions.map((option) => (
              <PaymentOptionItem key={option.id} option={option} />
            ))}
          </ul>
        ) : (
          <p>Contact the contest organizer for payment instructions.</p>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onOpenChange={onClose}
      step='claim'
      style={colors}
      title='Claim your square'
      mark={<TileChip payment='available' chosen />}
      description={spot}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
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
        <TextField
          label='Venmo handle'
          note='(optional)'
          autoComplete='off'
          hint='If you win, the organizer can use this to pay you.'
          error={errors.venmoHandle?.message}
          {...register('venmoHandle')}
        />
        {players &&
          (referredBy ? (
            <TextField label='Who sent you?' note='(optional)' value={referredBy.name} readOnly />
          ) : (
            <Select label='Who sent you?' note='(optional)' look='form' {...register('referredBySlug')}>
              <option value=''>No one / Found it myself</option>
              {players.map((player) => (
                <option key={player.slug} value={player.slug}>
                  {player.name}
                  {player.number ? ` #${player.number}` : ''}
                </option>
              ))}
            </Select>
          ))}
        <p role='alert' className={css.alert}>
          {serverError}
        </p>
        <div className={css.submit}>
          <Button type='submit' pending={isPending}>
            {isPending ? 'Claiming...' : 'Claim square'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
