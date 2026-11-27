'use client';

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/studio/button';
import { type BoardData, buildGrid, type GridSquare } from '@/components/studio/grid/model';
import { pressableClass, Tile, TileChip, tileClass } from '@/components/studio/grid/tile';
import { Select } from '@/components/studio/select';
import { Sheet } from '@/components/studio/sheet';
import { TextField } from '@/components/studio/text-field';
import { Mid } from '@/components/studio/type';
import { claimSquare } from '@/features/contests/actions/claim-square';
import type { PaymentOption, Player } from '@/features/contests/types';
import { formatPrizeAmount } from '@/features/contests/utils';
import { type ClaimSquareFormData, claimSquareSchema } from '@/features/contests/validation';
import { cn } from '@/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';

import { PaymentOptionItem } from './payment-option-item';

import css from './squares.module.css';

interface ClaimSheetProps {
  square: GridSquare;
  /** The board, for the squares around this one in the phone sheet. */
  board: BoardData;
  /** A card beside the board (wide screens), or a sheet from the bottom (phones). */
  beside: boolean;
  /** Another available square, picked from the ones around this one. */
  onChoose: (square: GridSquare) => void;
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
  board,
  beside,
  onChoose,
  contestId,
  squarePrice,
  paymentOptions,
  players,
  referredBy,
  colors,
  onClose,
}: ClaimSheetProps) {
  const router = useRouter();
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

        // Reload the board: a PIN contest has no realtime, so the claimed square would still look free
        setIsClaimed(true);
        router.refresh();
      } catch {
        setServerError('An unexpected error occurred. Please try again.');
      }
    });
  };

  const spot = `Row ${square.row_index + 1}, column ${square.col_index + 1}, ${formatPrizeAmount(Number(squarePrice))}`;

  const sheet = isClaimed
    ? {
        step: 'claimed',
        title: 'Square claimed. Complete your payment',
        description: `${spot}. Pending until the organizer marks it paid.`,
        body: (
          <>
            {paymentOptions.length > 0 ? (
              <ul className={css.payments}>
                {paymentOptions.map((option) => (
                  <PaymentOptionItem key={option.id} option={option} />
                ))}
              </ul>
            ) : (
              <p>Contact the contest organizer for payment instructions.</p>
            )}
            <Button look='team' className={css.wide} onClick={onClose}>
              Done
            </Button>
          </>
        ),
      }
    : {
        step: 'claim',
        title: 'Claim your square',
        description: spot,
        body: (
          <form noValidate onSubmit={handleSubmit(onSubmit)} className={css.claimForm}>
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
            <Button type='submit' look='team' pending={isPending} className={css.wide}>
              {isPending ? 'Claiming...' : 'Claim square'}
            </Button>
          </form>
        ),
      };
  const mark = isClaimed ? undefined : <TileChip payment='available' chosen />;

  if (beside) {
    return (
      <ClaimCard step={sheet.step} title={sheet.title} mark={mark} description={sheet.description} onClose={onClose}>
        {sheet.body}
      </ClaimCard>
    );
  }

  return (
    <Sheet
      open
      onOpenChange={onClose}
      step={sheet.step}
      style={colors}
      title={sheet.title}
      mark={mark}
      description={sheet.description}
      top={
        <div className={css.sheetTop}>
          <span aria-hidden='true' className={css.grabber} />
          {!isClaimed && (
            <Nearby
              square={square}
              board={board}
              onChoose={(next) => {
                setServerError('');
                onChoose(next);
              }}
            />
          )}
        </div>
      }
    >
      {sheet.body}
    </Sheet>
  );
}

interface ClaimCardProps {
  step: string;
  title: string;
  mark?: ReactNode;
  description: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Figma's Claim form as a card beside the board. Not a dialog: the board stays usable. Focus starts on the title and
 * goes back to the square on Close or Escape.
 */
function ClaimCard({ step, title, mark, description, onClose, children }: ClaimCardProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<Element | null>(null);

  // Back to the square once the card goes, unless focus has already moved on (another square was pressed)
  useEffect(() => {
    openerRef.current ??= document.activeElement;
    const opener = openerRef.current;
    return () => {
      const isLost = !document.activeElement || document.activeElement === document.body;
      if (isLost && opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  useEffect(() => {
    titleRef.current?.focus();
  }, [step]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
  };

  return (
    <section aria-labelledby={titleId} className={css.card} onKeyDown={handleKeyDown}>
      <div className={css.cardHeading}>
        <Mid as='h2' id={titleId} ref={titleRef} tabIndex={-1} className={css.cardTitle}>
          {title}
        </Mid>
        <button type='button' className={css.cardClose} aria-label='Close' onClick={onClose} />
      </div>
      <p className={css.cardSpot}>
        {mark}
        {description}
      </p>
      {children}
    </section>
  );
}

/** Rows and columns of squares shown around the one being claimed. */
const NEARBY_ROWS = 3;
const NEARBY_COLS = 5;

/** The squares around the chosen one at 56px, big enough to tap. Open ones can be picked instead. */
function Nearby({
  square,
  board,
  onChoose,
}: {
  square: GridSquare;
  board: BoardData;
  onChoose: (square: GridSquare) => void;
}) {
  const { rows } = buildGrid({ ...board, chosenSquareId: square.id });
  // Centred on the square, moved in at the board's edges
  const top = Math.min(Math.max(square.row_index - 1, 0), rows.length - NEARBY_ROWS);
  const left = Math.min(Math.max(square.col_index - 2, 0), rows[0].length - NEARBY_COLS);

  return (
    <div className={css.nearby}>
      {rows.slice(top, top + NEARBY_ROWS).map((cells) =>
        cells.slice(left, left + NEARBY_COLS).map((cell) => {
          const label = [cell.initials, cell.label].filter(Boolean).join(', ');
          const isOpen = cell.payment === 'available' && !!cell.square;
          return isOpen && !cell.chosen ? (
            <button
              key={`${cell.row}-${cell.col}`}
              type='button'
              aria-label={label}
              className={tileClass(cell, cn(css.nearbyTile, pressableClass(true)))}
              onClick={() => cell.square && onChoose(cell.square)}
            />
          ) : (
            <Tile
              key={`${cell.row}-${cell.col}`}
              payment={cell.payment}
              won={cell.won}
              found={cell.found}
              chosen={cell.chosen}
              className={css.nearbyTile}
            >
              {cell.initials}
            </Tile>
          );
        })
      )}
    </div>
  );
}
