'use client';

import { type ComponentProps, type ReactNode, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/utils/cn';
import * as Switch from '@radix-ui/react-switch';

import { DashButton, IconButton } from '../dashboard/dash-button';
import { srOnly } from '../theme';
import { textStyle } from '../type';

import field from '../field.module.css';
import css from './setup.module.css';

interface Wording {
  label: ReactNode;
  hint?: ReactNode;
  /** Empty or missing means valid. */
  error?: string;
}

function describe(id: string, { hint, error }: Omit<Wording, 'label'>) {
  return [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
}

function Notes({ id, hint, error }: Omit<Wording, 'label'> & { id: string }) {
  return (
    <>
      {error && (
        <p id={`${id}-error`} className={field.error}>
          {error}
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className={field.hint}>
          {hint}
        </p>
      )}
    </>
  );
}

/** TextField with more than one line. */
export function TextArea({ label, hint, error, id, className, ...props }: Wording & ComponentProps<'textarea'>) {
  const ownId = useId();
  const inputId = id ?? ownId;

  return (
    <div className={cn(field.field, className)}>
      <label htmlFor={inputId} className={cn(field.label, textStyle.label)}>
        {label}
      </label>
      <textarea
        id={inputId}
        className={cn(field.input, css.textarea)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(inputId, { hint, error })}
        {...props}
      />
      <Notes id={inputId} hint={hint} error={error} />
    </div>
  );
}

/** A number field with its unit inside: dollars before, percent after. */
export function UnitField({
  label,
  hint,
  error,
  unit,
  id,
  ...props
}: Wording & { unit: '$' | '%' } & ComponentProps<'input'>) {
  const ownId = useId();
  const inputId = id ?? ownId;

  return (
    <div className={field.field}>
      <label htmlFor={inputId} className={cn(field.label, textStyle.label)}>
        {label}
      </label>
      <div className={css.unit}>
        {unit === '$' && (
          <span data-side='before' aria-hidden='true'>
            $
          </span>
        )}
        <input
          id={inputId}
          type='number'
          className={field.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe(inputId, { hint, error })}
          {...props}
        />
        {unit === '%' && (
          <span data-side='after' aria-hidden='true'>
            %
          </span>
        )}
      </div>
      <Notes id={inputId} hint={hint} error={error} />
    </div>
  );
}

/** A setting that is on or off, with its explanation. */
export function SwitchRow({
  label,
  hint,
  id,
  ...props
}: { label: string; hint: string; id: string } & ComponentProps<typeof Switch.Root>) {
  return (
    <div className={css.switchRow}>
      <div>
        <label htmlFor={id}>{label}</label>
        <p id={`${id}-hint`} className={css.small}>
          {hint}
        </p>
      </div>
      <Switch.Root id={id} aria-describedby={`${id}-hint`} className={css.switch} {...props} />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}

/** One of two or three choices, side by side. */
export function Segmented<T extends string>({ legend, name, value, onChange, options }: SegmentedProps<T>) {
  return (
    <fieldset className={css.segmented}>
      <legend className={srOnly}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type='radio'
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className={css.over}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

interface ColorFieldProps extends ComponentProps<'input'> {
  label: string;
  error?: string;
  /** The color the picker shows. */
  color: string;
  onPick: (color: string) => void;
}

/** A color as a picker and as its hex value. The other props go on the hex input. */
export function ColorField({ label, error, color, onPick, id, className, ...props }: ColorFieldProps) {
  const ownId = useId();
  const inputId = id ?? ownId;

  return (
    <div className={field.field}>
      <label htmlFor={inputId} className={cn(field.label, textStyle.label)}>
        {label}
      </label>
      <div className={css.colorRow}>
        <input
          type='color'
          aria-label={`${label} picker`}
          value={color}
          onChange={(event) => onPick(event.target.value)}
        />
        <input
          id={inputId}
          className={cn(field.input, css.upper, className)}
          autoComplete='off'
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe(inputId, { error })}
          {...props}
        />
      </div>
      <Notes id={inputId} error={error} />
    </div>
  );
}

/** The access PIN: hidden until asked for, with a button that makes one. The other props go on the input. */
export function PinField({
  hint,
  error,
  onGenerate,
  id,
  ...props
}: { hint: string; error?: string; onGenerate: () => void; id: string } & ComponentProps<'input'>) {
  const [showPin, setShowPin] = useState(false);

  return (
    <div className={field.field}>
      <label htmlFor={id} className={cn(field.label, textStyle.label)}>
        Access PIN
      </label>
      <div className={css.pinRow}>
        <input
          id={id}
          type={showPin ? 'text' : 'password'}
          maxLength={6}
          placeholder='XXXXXX'
          autoComplete='off'
          className={cn(field.input, css.upper)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe(id, { hint, error })}
          {...props}
        />
        <IconButton label='Show PIN' aria-pressed={showPin} onClick={() => setShowPin(!showPin)}>
          {showPin ? <EyeOff aria-hidden='true' /> : <Eye aria-hidden='true' />}
        </IconButton>
        <DashButton look='quiet' onClick={onGenerate}>
          Generate
        </DashButton>
      </div>
      <Notes id={id} hint={hint} error={error} />
    </div>
  );
}
