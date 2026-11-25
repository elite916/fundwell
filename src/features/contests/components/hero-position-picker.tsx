'use client';

import css from '@/components/studio/setup/setup.module.css';

const POSITIONS = [
  ['top-left', 'top-center', 'top-right'],
  ['center-left', 'center', 'center-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
] as const;

export type HeroImagePosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface HeroPositionPickerProps {
  value: HeroImagePosition;
  onChange: (position: HeroImagePosition) => void;
  disabled?: boolean;
}

const positionLabels: Record<HeroImagePosition, string> = {
  'top-left': 'Top Left',
  'top-center': 'Top Center',
  'top-right': 'Top Right',
  'center-left': 'Center Left',
  center: 'Center',
  'center-right': 'Center Right',
  'bottom-left': 'Bottom Left',
  'bottom-center': 'Bottom Center',
  'bottom-right': 'Bottom Right',
};

export function HeroPositionPicker({ value, onChange, disabled }: HeroPositionPickerProps) {
  return (
    <div className={css.focus} aria-disabled={disabled || undefined} role='radiogroup' aria-label='Hero image position'>
      {POSITIONS.map((row, rowIndex) =>
        row.map((position) => {
          const isSelected = value === position;
          return (
            <button
              key={position}
              type='button'
              onClick={() => !disabled && onChange(position)}
              disabled={disabled}
              aria-label={positionLabels[position]}
              aria-checked={isSelected}
              role='radio'
            />
          );
        })
      )}
    </div>
  );
}
