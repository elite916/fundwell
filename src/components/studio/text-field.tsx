import { type ComponentProps, type ReactNode, useId } from 'react';

import { cn } from '@/utils/cn';

import { textStyle } from './type';

import css from './field.module.css';

interface TextFieldProps extends ComponentProps<'input'> {
  label: ReactNode;
  /** Adds a quiet note after the label, for example "(optional)". */
  note?: string;
  hint?: ReactNode;
  /** Empty or missing means valid. */
  error?: string;
}

/** A labelled input. Spreads react-hook-form's `register()` as is. */
export function TextField({ label, note, hint, error, id, className, ...props }: TextFieldProps) {
  const ownId = useId();
  const inputId = id ?? ownId;
  const describedBy = [error && `${inputId}-error`, hint && `${inputId}-hint`].filter(Boolean).join(' ');

  return (
    <div className={cn(css.field, className)}>
      <label htmlFor={inputId} className={cn(css.label, textStyle.label)}>
        {label} {note && <span>{note}</span>}
      </label>
      <input
        id={inputId}
        className={css.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className={css.error}>
          {error}
        </p>
      )}
      {hint && (
        <p id={`${inputId}-hint`} className={css.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
