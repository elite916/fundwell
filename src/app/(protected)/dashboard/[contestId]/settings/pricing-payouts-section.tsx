'use client';

import { useTransition } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Note } from '@/components/studio/dashboard/dash-page';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { Segmented } from '@/components/studio/setup/fields';
import { SetupSection } from '@/components/studio/setup/section';
import { TextField } from '@/components/studio/text-field';
import { useToast } from '@/components/ui/use-toast';
import { updateContest } from '@/features/contests/actions/update-contest';
import {
  ContestErrors,
  FOOTBALL_QUARTER_LABELS,
  hasGameStarted,
  PRIZE_TEXT_MAX_LENGTH,
} from '@/features/contests/constants';
import { Database } from '@/libs/supabase/types';
import { zodResolver } from '@hookform/resolvers/zod';

import css from '@/components/studio/setup/setup.module.css';

type Contest = Database['public']['Tables']['contests']['Row'];

// Base schema for pricing
const baseSchema = z.object({
  square_price: z.coerce.number().min(1, 'Price must be at least $1'),
  max_squares_per_person: z.coerce.number().min(1).max(100).nullable(),
});

// Football payout schema
const footballPayoutSchema = baseSchema
  .extend({
    prize_type: z.enum(['percentage', 'custom']).default('percentage'),
    payout_q1_percent: z.coerce.number().min(0).max(100),
    payout_q2_percent: z.coerce.number().min(0).max(100),
    payout_q3_percent: z.coerce.number().min(0).max(100),
    payout_final_percent: z.coerce.number().min(0).max(100),
    prize_q1_text: z.string().max(25, 'Prize text must be 25 characters or less').optional(),
    prize_q2_text: z.string().max(25, 'Prize text must be 25 characters or less').optional(),
    prize_q3_text: z.string().max(25, 'Prize text must be 25 characters or less').optional(),
    prize_final_text: z.string().max(25, 'Prize text must be 25 characters or less').optional(),
  })
  .refine(
    (data) => {
      if (data.prize_type === 'percentage') {
        const total =
          data.payout_q1_percent + data.payout_q2_percent + data.payout_q3_percent + data.payout_final_percent;
        return total <= 100;
      }
      return true;
    },
    { message: 'Total payouts cannot exceed 100%', path: ['payout_final_percent'] }
  );

// Baseball payout schema
const baseballPayoutSchema = baseSchema
  .extend({
    payout_game1_percent: z.coerce.number().min(0).max(100),
    payout_game2_percent: z.coerce.number().min(0).max(100),
    payout_game3_percent: z.coerce.number().min(0).max(100),
    payout_game4_percent: z.coerce.number().min(0).max(100),
    payout_game5_percent: z.coerce.number().min(0).max(100),
    payout_game6_percent: z.coerce.number().min(0).max(100),
    payout_game7_percent: z.coerce.number().min(0).max(100),
  })
  .refine(
    (data) => {
      const total =
        data.payout_game1_percent +
        data.payout_game2_percent +
        data.payout_game3_percent +
        data.payout_game4_percent +
        data.payout_game5_percent +
        data.payout_game6_percent +
        data.payout_game7_percent;
      return total <= 100;
    },
    { message: 'Total payouts cannot exceed 100%', path: ['payout_game7_percent'] }
  );

type FootballFormData = z.infer<typeof footballPayoutSchema>;
type BaseballFormData = z.infer<typeof baseballPayoutSchema>;

interface PricingPayoutsSectionProps {
  contest: Contest;
}

export function PricingPayoutsSection({ contest }: PricingPayoutsSectionProps) {
  const isFootball = contest.sport_type === 'football';

  if (isFootball) {
    return <FootballPayoutsForm contest={contest} />;
  }

  return <BaseballPayoutsForm contest={contest} />;
}

function FootballPayoutsForm({ contest }: { contest: Contest }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const locked = hasGameStarted(contest.status);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FootballFormData>({
    resolver: zodResolver(footballPayoutSchema) as Resolver<FootballFormData>,
    defaultValues: {
      square_price: contest.square_price,
      max_squares_per_person: contest.max_squares_per_person,
      prize_type: (contest.prize_type as 'percentage' | 'custom') ?? 'percentage',
      payout_q1_percent: contest.payout_q1_percent ?? 0,
      payout_q2_percent: contest.payout_q2_percent ?? 0,
      payout_q3_percent: contest.payout_q3_percent ?? 0,
      payout_final_percent: contest.payout_final_percent ?? 0,
      prize_q1_text: contest.prize_q1_text ?? undefined,
      prize_q2_text: contest.prize_q2_text ?? undefined,
      prize_q3_text: contest.prize_q3_text ?? undefined,
      prize_final_text: contest.prize_final_text ?? undefined,
    },
  });

  const watchedValues = watch();
  const prizeType = watchedValues.prize_type ?? 'percentage';
  const totalPercent =
    Number(watchedValues.payout_q1_percent || 0) +
    Number(watchedValues.payout_q2_percent || 0) +
    Number(watchedValues.payout_q3_percent || 0) +
    Number(watchedValues.payout_final_percent || 0);
  const totalPot = (watchedValues.square_price || 0) * 100;
  const totalPayout = (totalPot * totalPercent) / 100;
  const fundraiserKeeps = totalPot - totalPayout;

  const onSubmit = (data: FootballFormData) => {
    startTransition(async () => {
      const updates: Parameters<typeof updateContest>[1] = {
        square_price: data.square_price,
        max_squares_per_person: data.max_squares_per_person,
        prize_type: data.prize_type,
      };

      if (data.prize_type === 'percentage') {
        // Save payout percentages and clear prize text fields
        updates.payout_q1_percent = data.payout_q1_percent;
        updates.payout_q2_percent = data.payout_q2_percent;
        updates.payout_q3_percent = data.payout_q3_percent;
        updates.payout_final_percent = data.payout_final_percent;
        updates.prize_q1_text = null;
        updates.prize_q2_text = null;
        updates.prize_q3_text = null;
        updates.prize_final_text = null;
      } else {
        // Save prize text fields and set payout percentages to 0
        updates.payout_q1_percent = 0;
        updates.payout_q2_percent = 0;
        updates.payout_q3_percent = 0;
        updates.payout_final_percent = 0;
        updates.prize_q1_text = data.prize_q1_text || null;
        updates.prize_q2_text = data.prize_q2_text || null;
        updates.prize_q3_text = data.prize_q3_text || null;
        updates.prize_final_text = data.prize_final_text || null;
      }

      const result = await updateContest(contest.id, updates);

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
        description: 'Pricing and payouts have been updated.',
      });
    });
  };

  return (
    <SetupSection
      id='pricing-payouts'
      title='Pricing & Payouts'
      description='Set square price and payout percentages for each quarter.'
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={locked} className={css.plain}>
          {locked && <Note>{ContestErrors.RULES_LOCKED}.</Note>}

          {/* Pricing */}
          <div className={css.two}>
            <TextField
              id='square_price'
              label='Square Price ($)'
              type='number'
              min='1'
              error={errors.square_price?.message}
              {...register('square_price')}
            />
            <TextField
              id='max_squares_per_person'
              label='Max Squares Per Person'
              type='number'
              min='1'
              max='100'
              placeholder='No limit'
              error={errors.max_squares_per_person?.message}
              {...register('max_squares_per_person')}
            />
          </div>

          {/* Prize Type Selection */}
          <p className={css.label}>Prize Type</p>
          <Segmented
            legend='Prize Type'
            name='prize_type'
            value={prizeType}
            onChange={(value) => setValue('prize_type', value, { shouldDirty: true })}
            options={[
              { value: 'percentage', label: 'Cash Payouts' },
              { value: 'custom', label: 'Custom Prizes' },
            ]}
          />
          <input type='hidden' {...register('prize_type')} />
          {errors.prize_type && <p className={css.error}>{errors.prize_type.message}</p>}

          {/* Payout Percentages - Show when prize_type is 'percentage' */}
          {prizeType === 'percentage' && (
            <>
              <p className={`${css.label} ${css.softLabel}`}>Payout Percentages</p>
              <div className={css.four}>
                {FOOTBALL_QUARTER_LABELS.map((quarter) => {
                  const payoutField = quarter.dbField as keyof FootballFormData;
                  return (
                    <TextField
                      key={quarter.key}
                      id={payoutField}
                      label={`${quarter.label} (%)`}
                      type='number'
                      min='0'
                      max='100'
                      error={errors[payoutField]?.message}
                      {...register(payoutField)}
                    />
                  );
                })}
              </div>

              {/* Calculated Totals */}
              <dl className={css.totals}>
                <div>
                  <dt>Total pot if all squares sell</dt>
                  <dd>${totalPot.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Total Payout ({totalPercent}%)</dt>
                  <dd>${totalPayout.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Fundraiser Keeps</dt>
                  <dd>${fundraiserKeeps.toLocaleString()}</dd>
                </div>
              </dl>
            </>
          )}

          {/* Custom Prize Text Inputs - Show when prize_type is 'custom' */}
          {prizeType === 'custom' && (
            <>
              <p className={css.label}>Custom Prize Descriptions</p>
              <p className={css.hintUp}>
                Enter prize descriptions for each quarter (max {PRIZE_TEXT_MAX_LENGTH} characters each).
              </p>

              <div className={css.two}>
                {FOOTBALL_QUARTER_LABELS.map((quarter) => {
                  const prizeField = `prize_${quarter.key}_text` as keyof FootballFormData;
                  return (
                    <TextField
                      key={quarter.key}
                      id={prizeField}
                      label={`${quarter.label} Prize`}
                      type='text'
                      maxLength={PRIZE_TEXT_MAX_LENGTH}
                      placeholder='e.g., $100 Gift Card'
                      error={errors[prizeField]?.message}
                      {...register(prizeField)}
                    />
                  );
                })}
              </div>
            </>
          )}

          <div className={css.save}>
            <BusyButton busy={isPending} type='submit' disabled={!isDirty}>
              Save Changes
            </BusyButton>
          </div>
        </fieldset>
      </form>
    </SetupSection>
  );
}

function BaseballPayoutsForm({ contest }: { contest: Contest }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const locked = hasGameStarted(contest.status);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<BaseballFormData>({
    resolver: zodResolver(baseballPayoutSchema) as Resolver<BaseballFormData>,
    defaultValues: {
      square_price: contest.square_price,
      max_squares_per_person: contest.max_squares_per_person,
      payout_game1_percent: contest.payout_game1_percent ?? 0,
      payout_game2_percent: contest.payout_game2_percent ?? 0,
      payout_game3_percent: contest.payout_game3_percent ?? 0,
      payout_game4_percent: contest.payout_game4_percent ?? 0,
      payout_game5_percent: contest.payout_game5_percent ?? 0,
      payout_game6_percent: contest.payout_game6_percent ?? 0,
      payout_game7_percent: contest.payout_game7_percent ?? 0,
    },
  });

  const watchedValues = watch();
  const totalPercent =
    Number(watchedValues.payout_game1_percent || 0) +
    Number(watchedValues.payout_game2_percent || 0) +
    Number(watchedValues.payout_game3_percent || 0) +
    Number(watchedValues.payout_game4_percent || 0) +
    Number(watchedValues.payout_game5_percent || 0) +
    Number(watchedValues.payout_game6_percent || 0) +
    Number(watchedValues.payout_game7_percent || 0);
  const totalPot = (watchedValues.square_price || 0) * 100;
  const totalPayout = (totalPot * totalPercent) / 100;
  const fundraiserKeeps = totalPot - totalPayout;

  const onSubmit = (data: BaseballFormData) => {
    startTransition(async () => {
      const result = await updateContest(contest.id, {
        square_price: data.square_price,
        max_squares_per_person: data.max_squares_per_person,
        payout_game1_percent: data.payout_game1_percent,
        payout_game2_percent: data.payout_game2_percent,
        payout_game3_percent: data.payout_game3_percent,
        payout_game4_percent: data.payout_game4_percent,
        payout_game5_percent: data.payout_game5_percent,
        payout_game6_percent: data.payout_game6_percent,
        payout_game7_percent: data.payout_game7_percent,
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
        description: 'Pricing and payouts have been updated.',
      });
    });
  };

  const gameLabels = ['Game 1', 'Game 2', 'Game 3', 'Game 4', 'Game 5', 'Game 6', 'Game 7'];
  const gameFields = [
    'payout_game1_percent',
    'payout_game2_percent',
    'payout_game3_percent',
    'payout_game4_percent',
    'payout_game5_percent',
    'payout_game6_percent',
    'payout_game7_percent',
  ] as const;

  return (
    <SetupSection
      id='pricing-payouts'
      title='Pricing & Payouts'
      description='Set square price and payout percentages for each game.'
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={locked} className={css.plain}>
          {locked && <Note>{ContestErrors.RULES_LOCKED}.</Note>}

          {/* Pricing */}
          <div className={css.two}>
            <TextField
              id='square_price'
              label='Square Price ($)'
              type='number'
              min='1'
              error={errors.square_price?.message}
              {...register('square_price')}
            />
            <TextField
              id='max_squares_per_person'
              label='Max Squares Per Person'
              type='number'
              min='1'
              max='100'
              placeholder='No limit'
              error={errors.max_squares_per_person?.message}
              {...register('max_squares_per_person')}
            />
          </div>

          {/* Payouts */}
          <p className={`${css.label} ${css.softLabel}`}>Payout Percentages</p>
          <div className={css.four}>
            {gameFields.map((field, index) => (
              <TextField
                key={field}
                id={field}
                label={`${gameLabels[index]} (%)`}
                type='number'
                min='0'
                max='100'
                error={errors[field]?.message}
                {...register(field)}
              />
            ))}
          </div>

          {/* Calculated Totals */}
          <dl className={css.totals}>
            <div>
              <dt>Total pot if all squares sell</dt>
              <dd>${totalPot.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Total Payout ({totalPercent}%)</dt>
              <dd>${totalPayout.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Fundraiser Keeps</dt>
              <dd>${fundraiserKeeps.toLocaleString()}</dd>
            </div>
          </dl>

          <div className={css.save}>
            <BusyButton busy={isPending} type='submit' disabled={!isDirty}>
              Save Changes
            </BusyButton>
          </div>
        </fieldset>
      </form>
    </SetupSection>
  );
}
