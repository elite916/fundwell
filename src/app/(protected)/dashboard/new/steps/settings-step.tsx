'use client';

import { Fragment, useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { PinField, Segmented, SwitchRow, UnitField } from '@/components/studio/setup/fields';
import { TextField } from '@/components/studio/text-field';
import { FOOTBALL_QUARTER_LABELS, PRIZE_TEXT_MAX_LENGTH } from '@/features/contests/constants';
import { CreateContestInput, SportType } from '@/features/contests/models/contest';

import css from '@/components/studio/setup/setup.module.css';

/**
 * Generates a random 6-character alphanumeric PIN
 */
function generateRandomPin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

type PayoutField = {
  name: keyof CreateContestInput;
  label: string;
};

const FOOTBALL_PAYOUT_FIELDS: PayoutField[] = FOOTBALL_QUARTER_LABELS.map((q) => ({
  name: q.formField as keyof CreateContestInput,
  label: q.label,
}));

const BASEBALL_PAYOUT_FIELDS: PayoutField[] = [
  { name: 'payoutGame1Percent', label: 'Game 1' },
  { name: 'payoutGame2Percent', label: 'Game 2' },
  { name: 'payoutGame3Percent', label: 'Game 3' },
  { name: 'payoutGame4Percent', label: 'Game 4' },
  { name: 'payoutGame5Percent', label: 'Game 5' },
  { name: 'payoutGame6Percent', label: 'Game 6' },
  { name: 'payoutGame7Percent', label: 'Game 7' },
];

const FOOTBALL_PAYOUT_NAMES = ['payoutQ1Percent', 'payoutQ2Percent', 'payoutQ3Percent', 'payoutFinalPercent'] as const;
const BASEBALL_PAYOUT_NAMES = [
  'payoutGame1Percent',
  'payoutGame2Percent',
  'payoutGame3Percent',
  'payoutGame4Percent',
  'payoutGame5Percent',
  'payoutGame6Percent',
  'payoutGame7Percent',
] as const;

export function SettingsStep() {
  const {
    register,
    formState: { errors },
    control,
    setValue,
  } = useFormContext<CreateContestInput>();

  const [hasGeneratedPin, setHasGeneratedPin] = useState(false);

  const sportType = useWatch({ control, name: 'sportType' }) as SportType;
  const squarePrice = useWatch({ control, name: 'squarePrice' });
  const requirePin = useWatch({ control, name: 'requirePin' });
  const accessPin = useWatch({ control, name: 'accessPin' });
  const prizeType = useWatch({ control, name: 'prizeType' });

  // Auto-generate PIN when toggle is turned on (only once, not when user is editing)
  useEffect(() => {
    if (requirePin && !accessPin && !hasGeneratedPin) {
      setValue('accessPin', generateRandomPin());
      setHasGeneratedPin(true);
    }
  }, [requirePin, accessPin, hasGeneratedPin, setValue]);

  const handleGeneratePin = () => {
    setValue('accessPin', generateRandomPin());
    setHasGeneratedPin(true);
  };

  const handleRequirePinChange = (checked: boolean) => {
    setValue('requirePin', checked);
    if (!checked) {
      setValue('accessPin', undefined);
      setHasGeneratedPin(false);
    }
  };

  // Watch all payout values
  const footballPayouts = useWatch({ control, name: FOOTBALL_PAYOUT_NAMES as unknown as (keyof CreateContestInput)[] });
  const baseballPayouts = useWatch({ control, name: BASEBALL_PAYOUT_NAMES as unknown as (keyof CreateContestInput)[] });

  const isFootball = sportType === 'football';
  const payoutFields = isFootball ? FOOTBALL_PAYOUT_FIELDS : BASEBALL_PAYOUT_FIELDS;
  const payoutValues = isFootball ? footballPayouts : baseballPayouts;

  const totalPayout =
    (payoutValues as (number | undefined)[]).reduce((sum, val) => (sum ?? 0) + (Number(val) || 0), 0) ?? 0;
  const totalPot = (Number(squarePrice) || 0) * 100;

  return (
    <>
      <div className={css.two}>
        <UnitField
          id='squarePrice'
          label='Price Per Square *'
          unit='$'
          min='1'
          step='1'
          placeholder='10'
          hint={totalPot > 0 && `Total pot if all squares sell: $${totalPot.toLocaleString()}`}
          error={errors.squarePrice?.message}
          {...register('squarePrice')}
        />
        <TextField
          id='maxSquaresPerPerson'
          label='Max Squares Per Person'
          type='number'
          min='1'
          max='100'
          placeholder='No limit'
          hint='Leave blank to allow unlimited squares per participant.'
          error={errors.maxSquaresPerPerson?.message}
          {...register('maxSquaresPerPerson')}
        />
      </div>

      {/* Prize Type Selection */}
      <p className={css.label}>Prize Type</p>
      <Segmented
        legend='Prize Type'
        name='prize-type'
        value={prizeType ?? 'percentage'}
        onChange={(value) => setValue('prizeType', value)}
        options={[
          { value: 'percentage', label: 'Cash Payouts' },
          { value: 'custom', label: 'Custom Prizes' },
        ]}
      />
      <input type='hidden' {...register('prizeType')} />
      {errors.prizeType && <p className={css.error}>{errors.prizeType.message}</p>}

      {/* Payout Distribution - Show when prizeType is 'percentage' */}
      {prizeType === 'percentage' && (
        <>
          <div className={css.groupFirst}>
            <h3>Payout Distribution</h3>
            <p>
              {isFootball
                ? 'How winnings are split between quarters. The rest goes to your fundraiser.'
                : 'How winnings are split between games. The rest goes to your fundraiser.'}
            </p>
            {!isFootball && <p>If the series ends early, remaining game payouts go to the fundraiser.</p>}
          </div>

          {/* Visual Progress Bar */}
          <div className={css.bars} aria-hidden='true'>
            {payoutFields.map((field, index) => (
              <i key={field.name} style={{ width: `${Number(payoutValues[index]) || 0}%` }} />
            ))}
          </div>

          {/* Payout Inputs */}
          <div className={css.four}>
            {payoutFields.map((field) => (
              <UnitField
                key={field.name}
                id={field.name}
                label={field.label}
                unit='%'
                min='0'
                max='100'
                aria-invalid={errors[field.name] ? true : undefined}
                {...register(field.name)}
              />
            ))}
          </div>

          {/* Total Indicator */}
          <p className={css.totalLine} role='status'>
            <span>Total Payouts: {totalPayout}%</span>
            {totalPayout <= 100 ? (
              <span>✓ Valid ({100 - totalPayout}% to fundraiser)</span>
            ) : (
              <span>{totalPayout - 100}% over limit</span>
            )}
          </p>

          {errors.payoutFinalPercent && <p className={css.error}>{errors.payoutFinalPercent.message}</p>}
          {errors.payoutGame7Percent && <p className={css.error}>{errors.payoutGame7Percent.message}</p>}

          {/* Payout Breakdown */}
          {totalPot > 0 && totalPayout <= 100 && (
            <>
              <h3>Payout Breakdown</h3>
              <dl className={css.breakdown}>
                <dt>Total Pot (100 squares × ${Number(squarePrice).toLocaleString()})</dt>
                <dd>${totalPot.toLocaleString()}</dd>

                {/* Payouts by quarter/game */}
                {payoutFields.map((field, index) => {
                  const percent = Number(payoutValues[index]) || 0;
                  const amount = (totalPot * percent) / 100;
                  return (
                    <Fragment key={field.name}>
                      <dt className={css.soft}>
                        {field.label}: {percent}%
                      </dt>
                      <dd>${amount.toLocaleString()}</dd>
                    </Fragment>
                  );
                })}

                {/* Total Payouts */}
                <dt data-line='rule'>Total Payouts ({totalPayout}%)</dt>
                <dd data-line='rule'>${((totalPot * totalPayout) / 100).toLocaleString()}</dd>

                {/* Fundraiser Keeps */}
                <dt data-line='total'>Fundraiser Keeps ({100 - totalPayout}%)</dt>
                <dd data-line='total'>${((totalPot * (100 - totalPayout)) / 100).toLocaleString()}</dd>
              </dl>
            </>
          )}
        </>
      )}

      {/* Custom Prize Text Inputs - Show when prizeType is 'custom' */}
      {prizeType === 'custom' && (
        <>
          <div className={css.groupFirst}>
            <h3>Custom Prize Descriptions</h3>
            <p>Enter prize descriptions for each quarter (max {PRIZE_TEXT_MAX_LENGTH} characters each).</p>
          </div>

          <div className={css.two}>
            <TextField
              id='prizeQ1Text'
              label='Q1 Prize'
              type='text'
              maxLength={PRIZE_TEXT_MAX_LENGTH}
              placeholder='e.g., $100 Gift Card'
              error={errors.prizeQ1Text?.message}
              {...register('prizeQ1Text')}
            />
            <TextField
              id='prizeQ2Text'
              label='Halftime Prize'
              type='text'
              maxLength={PRIZE_TEXT_MAX_LENGTH}
              placeholder='e.g., $200 Gift Card'
              error={errors.prizeQ2Text?.message}
              {...register('prizeQ2Text')}
            />
            <TextField
              id='prizeQ3Text'
              label='Q3 Prize'
              type='text'
              maxLength={PRIZE_TEXT_MAX_LENGTH}
              placeholder='e.g., $300 Gift Card'
              error={errors.prizeQ3Text?.message}
              {...register('prizeQ3Text')}
            />
            <TextField
              id='prizeFinalText'
              label='Final Prize'
              type='text'
              maxLength={PRIZE_TEXT_MAX_LENGTH}
              placeholder='e.g., $500 Gift Card'
              error={errors.prizeFinalText?.message}
              {...register('prizeFinalText')}
            />
          </div>
        </>
      )}

      {/* Access Control */}
      <div className={css.group}>
        <h3>Access Control</h3>
        <p>Restrict who can view your contest.</p>
      </div>

      {/* Require PIN Toggle */}
      <SwitchRow
        id='requirePin'
        label='Require PIN to access'
        hint='When enabled, participants must enter a PIN to view your contest'
        checked={requirePin ?? false}
        onCheckedChange={handleRequirePinChange}
      />

      {/* PIN Input (shown when toggle is ON) */}
      {requirePin && (
        <div className={css.gapTopSmall}>
          <PinField
            id='accessPin'
            hint='6 characters max, letters and numbers only.'
            error={errors.accessPin?.message}
            onGenerate={handleGeneratePin}
            {...register('accessPin')}
          />
        </div>
      )}
    </>
  );
}
