import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';
import { Slot } from '@radix-ui/react-slot';

import { textStyle } from './type';

import css from './button.module.css';

interface ButtonProps extends ComponentProps<'button'> {
  /**
   * `button` is the main action, one per view. `team` is the same in the organizer's color. `danger` is red, for the
   * final confirm of something that can't be undone. `link` is underlined text.
   */
  look?: 'button' | 'team' | 'danger' | 'link';
  /** Waiting on the server: can't be pressed, and says so to screen readers. */
  pending?: boolean;
  /** Put the look on the child instead, for example a next/link. */
  asChild?: boolean;
}

export function Button({ look = 'button', pending, asChild, className, type, disabled, ...props }: ButtonProps) {
  const looks = cn(css[look], look !== 'link' && textStyle.button, className);

  if (asChild) return <Slot className={looks} {...props} />;

  return (
    <button
      type={type ?? 'button'}
      className={looks}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    />
  );
}
