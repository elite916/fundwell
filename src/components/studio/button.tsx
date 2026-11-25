import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';
import { Slot } from '@radix-ui/react-slot';

import css from './button.module.css';

interface ButtonProps extends ComponentProps<'button'> {
  /** `button` is the black pill, one main action per view. `link` is underlined text. */
  look?: 'button' | 'link';
  /** Waiting on the server: can't be pressed, and says so to screen readers. */
  pending?: boolean;
  /** Put the look on the child instead, for example a next/link. */
  asChild?: boolean;
}

export function Button({ look = 'button', pending, asChild, className, type, disabled, ...props }: ButtonProps) {
  const looks = cn(css[look], className);

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
