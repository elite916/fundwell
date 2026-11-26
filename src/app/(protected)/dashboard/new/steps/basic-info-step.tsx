'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { DashCheckbox } from '@/components/studio/dashboard/dash-button';
import { TextArea } from '@/components/studio/setup/fields';
import { TextField } from '@/components/studio/text-field';
import { CreateContestFormValues, SportType } from '@/features/contests/models/contest';

import css from '@/components/studio/setup/setup.module.css';

const SPORT_OPTIONS: {
  value: SportType | 'hit-a-thon';
  label: string;
  placeholder: { row: string; col: string };
  comingSoon?: boolean;
  description?: string;
}[] = [
  {
    value: 'football',
    label: 'Football',
    placeholder: { row: 'Kansas City Chiefs', col: 'San Francisco 49ers' },
  },
  {
    value: 'baseball',
    label: 'Baseball',
    placeholder: { row: 'New York Yankees', col: 'Los Angeles Dodgers' },
    comingSoon: true,
  },
  {
    value: 'hit-a-thon',
    label: 'Hit-a-thon',
    placeholder: { row: 'Team 1', col: 'Team 2' },
    description:
      "Supporters pledge to one player, per hit or a flat amount. After the event, you enter each player's hits.",
  },
];

const HIT_A_THON_HOW_IT_WORKS =
  "Supporters pledge to one player, either an amount per hit or a flat gift. After the event, you enter each player's hits and lock them. Fundwell then emails each supporter their total and your payment options.";

const SPORT_DESCRIPTIONS: Record<SportType, string> = {
  football:
    "Your 10×10 grid will have the row team's last digit of their score on the left axis, and the column team's on the top. Winners are determined by matching the last digit of each team's score at the end of each quarter.",
  baseball:
    "Your 10×10 grid will have the row team's last digit of their score on the left axis, and the column team's on the top. Winners are determined by matching the last digit of each team's score at the end of each game in the series.",
};

export function BasicInfoStep({ isSuperBowlOpen }: { isSuperBowlOpen: boolean }) {
  const {
    register,
    formState: { errors },
    control,
    setValue,
  } = useFormContext<CreateContestFormValues>();

  const isHitAThon = useWatch({ control, name: 'kind' }) === 'hit_a_thon';
  const sportType = useWatch({ control, name: 'sportType' }) || 'football';
  const currentSport = SPORT_OPTIONS.find((s) => s.value === sportType) || SPORT_OPTIONS[0];
  const picked = isHitAThon ? 'hit-a-thon' : sportType;

  return (
    <>
      {/* Sport Type Selector */}
      <fieldset className={`${css.plain} ${css.gapBottom}`}>
        <legend className={css.label}>Sport Type *</legend>
        <div className={css.kinds}>
          {SPORT_OPTIONS.map((sport) => {
            const isDisabled = sport.comingSoon;
            return (
              <label key={sport.value}>
                <input
                  type='radio'
                  name='sport-type'
                  className={css.over}
                  checked={picked === sport.value}
                  onChange={() => {
                    if (isDisabled) return;
                    if (sport.value === 'hit-a-thon') {
                      setValue('kind', 'hit_a_thon');
                    } else {
                      setValue('kind', 'squares');
                      setValue('sportType', sport.value, { shouldValidate: true });
                    }
                  }}
                  disabled={isDisabled}
                  // The description is read after the name, not as part of it
                  aria-label={sport.description ? sport.label : undefined}
                  aria-describedby={sport.description ? `${sport.value}-about` : undefined}
                />
                <span>
                  {sport.label}
                  {isDisabled && <small>Coming Soon</small>}
                  {sport.description && <small id={`${sport.value}-about`}>{sport.description}</small>}
                </span>
              </label>
            );
          })}
        </div>
        {/* Hidden input for form registration */}
        <input type='hidden' {...register('sportType')} />
        <input type='hidden' {...register('kind')} />
      </fieldset>

      <TextField
        id='name'
        label='Contest Name *'
        placeholder={
          isHitAThon
            ? 'Spring Hit-a-thon 2027'
            : sportType === 'football'
              ? 'Super Bowl Squares 2025'
              : 'World Series Squares 2025'
        }
        hint='This is what participants will see when they join your contest.'
        error={errors.name?.message}
        autoComplete='off'
        {...register('name')}
      />

      <TextArea
        id='description'
        label='Description'
        placeholder='Fundraiser for our youth sports league. All proceeds go to new equipment!'
        hint='Optional. Add context about your fundraiser or organization.'
        error={errors.description?.message}
        {...register('description')}
      />

      {/* Team Names */}
      {!isHitAThon && (
        <>
          <div className={css.group}>
            <h3>Team Names</h3>
            <p>Enter the teams playing in your game. Row team scores will be matched against the row axis.</p>
          </div>

          <div className={css.two}>
            <TextField
              id='rowTeamName'
              label='Row Team (Home) *'
              placeholder={currentSport.placeholder.row}
              error={errors.rowTeamName?.message}
              autoComplete='off'
              {...register('rowTeamName')}
            />
            <TextField
              id='colTeamName'
              label='Column Team (Away) *'
              placeholder={currentSport.placeholder.col}
              error={errors.colTeamName?.message}
              autoComplete='off'
              {...register('colTeamName')}
            />
          </div>
        </>
      )}

      {!isHitAThon && sportType === 'football' && isSuperBowlOpen && (
        <div className={css.checkRow}>
          <DashCheckbox id='isSuperBowl' aria-describedby='isSuperBowl-hint' {...register('isSuperBowl')} />
          <label htmlFor='isSuperBowl'>Super Bowl contest</label>
          <p id='isSuperBowl-hint' className={css.small}>
            Fundwell enters the score after each quarter. You can still enter or correct scores yourself.
          </p>
        </div>
      )}

      {/* Grid Preview Hint */}
      <p className={css.say}>
        <b>How it works</b>
        {isHitAThon ? HIT_A_THON_HOW_IT_WORKS : SPORT_DESCRIPTIONS[sportType as SportType]}
      </p>
    </>
  );
}
