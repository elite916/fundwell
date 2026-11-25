'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { TextArea } from '@/components/studio/setup/fields';
import { TextField } from '@/components/studio/text-field';
import { CreateContestInput, SportType } from '@/features/contests/models/contest';

import css from '@/components/studio/setup/setup.module.css';

const SPORT_OPTIONS: {
  value: SportType | 'hit-a-thon';
  label: string;
  placeholder: { row: string; col: string };
  comingSoon?: boolean;
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
    comingSoon: true,
  },
];

const SPORT_DESCRIPTIONS: Record<SportType, string> = {
  football:
    "Your 10×10 grid will have the row team's last digit of their score on the left axis, and the column team's on the top. Winners are determined by matching the last digit of each team's score at the end of each quarter.",
  baseball:
    "Your 10×10 grid will have the row team's last digit of their score on the left axis, and the column team's on the top. Winners are determined by matching the last digit of each team's score at the end of each game in the series.",
};

export function BasicInfoStep() {
  const {
    register,
    formState: { errors },
    control,
    setValue,
  } = useFormContext<CreateContestInput>();

  const sportType = useWatch({ control, name: 'sportType' }) || 'football';
  const currentSport = SPORT_OPTIONS.find((s) => s.value === sportType) || SPORT_OPTIONS[0];

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
                  checked={sportType === sport.value}
                  onChange={() => {
                    if (!isDisabled && sport.value !== 'hit-a-thon') {
                      setValue('sportType', sport.value as SportType, { shouldValidate: true });
                    }
                  }}
                  disabled={isDisabled}
                />
                <span>
                  {sport.label}
                  {isDisabled && <small>Coming Soon</small>}
                </span>
              </label>
            );
          })}
        </div>
        {/* Hidden input for form registration */}
        <input type='hidden' {...register('sportType')} />
      </fieldset>

      <TextField
        id='name'
        label='Contest Name *'
        placeholder={sportType === 'football' ? 'Super Bowl Squares 2025' : 'World Series Squares 2025'}
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

      {/* Grid Preview Hint */}
      <p className={css.say}>
        <b>How it works</b>
        {SPORT_DESCRIPTIONS[sportType as SportType]}
      </p>
    </>
  );
}
