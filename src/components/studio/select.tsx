import { type ComponentProps, type ReactNode, useId } from 'react';

import { cn } from '@/utils/cn';

import css from './field.module.css';

interface SelectProps extends ComponentProps<'select'> {
  label: ReactNode;
  /** Adds a quiet note after the label, for example "(optional)". */
  note?: string;
  /** Empty or missing means valid. Form look only. */
  error?: string;
  /** `text` sits in a line of words; `form` matches TextField. */
  look?: 'text' | 'form';
}

/** A native select with its label. Pass `<option>`s as children. */
export function Select({ label, note, error, look = 'text', id, className, children, ...props }: SelectProps) {
  const ownId = useId();
  const selectId = id ?? ownId;
  const isForm = look === 'form';

  return (
    <div className={cn(isForm ? css.field : css.inlineField, className)}>
      <label htmlFor={selectId} className={css.label}>
        {label} {note && <span>{note}</span>}
      </label>
      <select
        id={selectId}
        className={isForm ? cn(css.input, css.select) : css.inlineSelect}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className={css.error}>
          {error}
        </p>
      )}
    </div>
  );
}
