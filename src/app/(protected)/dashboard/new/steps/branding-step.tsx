'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { organizerColors } from '@/components/studio/color';
import { ColorField } from '@/components/studio/setup/fields';
import { CreateContestInput } from '@/features/contests/models/contest';

import css from '@/components/studio/setup/setup.module.css';

const PRESET_COLORS = [
  { name: 'Orange', primary: '#F97316', secondary: '#D97706' },
  { name: 'Blue', primary: '#3B82F6', secondary: '#1D4ED8' },
  { name: 'Green', primary: '#22C55E', secondary: '#16A34A' },
  { name: 'Purple', primary: '#A855F7', secondary: '#7C3AED' },
  { name: 'Red', primary: '#EF4444', secondary: '#DC2626' },
  { name: 'Teal', primary: '#14B8A6', secondary: '#0D9488' },
];

export function BrandingStep() {
  const {
    register,
    formState: { errors },
    control,
    setValue,
  } = useFormContext<CreateContestInput>();

  const [primaryColor, secondaryColor] = useWatch({ control, name: ['primaryColor', 'secondaryColor'] });

  function selectPreset(primary: string, secondary: string) {
    setValue('primaryColor', primary, { shouldValidate: true });
    setValue('secondaryColor', secondary, { shouldValidate: true });
  }

  return (
    <>
      {/* Color Theme */}
      <fieldset className={css.plain}>
        <legend className={css.label}>Color Theme</legend>
        <p className={css.hintUp}>Choose colors that match your organization or event.</p>

        {/* Preset Colors */}
        <div className={css.themes}>
          {PRESET_COLORS.map((preset) => (
            <label key={preset.name}>
              <input
                type='radio'
                name='color-theme'
                className={css.over}
                checked={primaryColor === preset.primary}
                onChange={() => selectPreset(preset.primary, preset.secondary)}
                // Picking the marked theme again puts its second color back
                onClick={() => selectPreset(preset.primary, preset.secondary)}
              />
              <span>
                <i style={{ background: `linear-gradient(90deg, ${preset.primary} 50%, ${preset.secondary} 50%)` }} />
                {preset.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Custom Color Pickers */}
      <div className={css.two}>
        <ColorField
          id='primaryColor'
          label='Primary Color'
          color={primaryColor || '#17603F'}
          onPick={(color) => setValue('primaryColor', color, { shouldValidate: true })}
          placeholder='#17603F'
          error={errors.primaryColor?.message}
          {...register('primaryColor')}
        />
        <ColorField
          id='secondaryColor'
          label='Secondary Color'
          color={secondaryColor || '#F2B233'}
          onPick={(color) => setValue('secondaryColor', color, { shouldValidate: true })}
          placeholder='#F2B233'
          error={errors.secondaryColor?.message}
          {...register('secondaryColor')}
        />
      </div>

      {/* Color Preview */}
      <div className={css.swatch} style={organizerColors(primaryColor || '#17603F', secondaryColor || '#F2B233')}>
        <span>Preview</span>
      </div>

      {/* Contest Images Notice */}
      <p className={css.say}>
        <b>Contest Images</b>
        You can upload an organization logo after creating your contest. Simply go to your contest
        settings and use the image upload feature in the branding section.
      </p>

      {/* Info Note */}
      <p className={css.say}>
        <b>Don&apos;t worry!</b>
        You can always update your contest branding later from the contest settings page. Your contest will be created
        as a draft, so you can finalize everything before going live.
      </p>
    </>
  );
}
