import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

import { DashButton } from '../dashboard/dash-button';

import css from './setup.module.css';

/** A button that can't be pressed while its work is under way, and shows it. */
export function BusyButton({
  busy,
  disabled,
  className,
  ...props
}: ComponentProps<typeof DashButton> & { busy: boolean }) {
  return (
    <DashButton
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(busy && css.busy, className)}
      {...props}
    />
  );
}
