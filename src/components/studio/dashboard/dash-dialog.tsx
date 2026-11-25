'use client';

import { type ReactNode, type RefObject, useRef } from 'react';

import { cn } from '@/utils/cn';
import * as Dialog from '@radix-ui/react-dialog';

import { dashTheme } from './dash-page';

import css from './dash-dialog.module.css';

interface DashDialogProps {
  open: boolean;
  /** Escape, the close button and a press outside. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  size?: 'small' | 'mid' | 'wide';
  /** Where focus starts. Without it, on the title. */
  startRef?: RefObject<HTMLElement | null>;
}

/** A dialog over the dashboard: centered, and a sheet from the bottom on phones. Focus goes back where it came from. */
export function DashDialog({ open, onClose, title, description, children, size = 'small', startRef }: DashDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<Element | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content
          className={cn(dashTheme, css.dialog, size !== 'small' && css[size])}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current = document.activeElement;
            const start = startRef?.current ?? titleRef.current;
            start?.focus({ preventScroll: true });
            if (start !== titleRef.current) start?.scrollIntoView({ block: 'center' });
          }}
          onCloseAutoFocus={(event) => {
            // Radix only goes back to its own trigger, and these dialogs are opened from state.
            event.preventDefault();
            if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
          }}
          {...(!description && { 'aria-describedby': undefined })}
        >
          <div className={css.inner}>
            <div className={css.header}>
              <Dialog.Title ref={titleRef} tabIndex={-1} className={css.title}>
                {title}
              </Dialog.Title>
              {description && <Dialog.Description className={css.description}>{description}</Dialog.Description>}
              <Dialog.Close className={css.close} aria-label='Close' />
            </div>
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A dialog's buttons. `stack` puts them under each other at full width. */
export function DashDialogFoot({ stack, children }: { stack?: boolean; children: ReactNode }) {
  return <div className={cn(css.foot, stack && css.stack)}>{children}</div>;
}
