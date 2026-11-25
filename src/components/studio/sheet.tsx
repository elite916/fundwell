'use client';

import { type ReactNode, useRef } from 'react';

import { cn } from '@/utils/cn';
import * as Dialog from '@radix-ui/react-dialog';

import { studioTheme } from './theme';
import { Mid } from './type';

import css from './sheet.module.css';

interface SheetProps {
  open: boolean;
  /** Called with false by Escape, the close button and a press outside. */
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** A TileChip shown before the description on phones, where the sheet covers the board. */
  mark?: ReactNode;
  children?: ReactNode;
  /** Buttons, kept at the bottom. */
  footer?: ReactNode;
  /** `side` opens on the left on wide screens. `center` is a dialog. Both come up from the bottom on phones. */
  placement?: 'side' | 'center';
  /** False for a dialog that has to be answered, such as a PIN. */
  dismissible?: boolean;
  /** The organizer's colors, from `organizerColors()`. The sheet is outside the page that set them. */
  style?: React.CSSProperties;
}

/** A dialog that keeps the page behind it in view. Focus starts on the title and goes back where it came from. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  mark,
  children,
  footer,
  placement = 'side',
  dismissible = true,
  style,
}: SheetProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const keepOpen = (event: Event) => {
    if (!dismissible) event.preventDefault();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content
          className={cn(studioTheme, css.sheet, css[placement])}
          style={style}
          data-studio-sheet={placement}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            titleRef.current?.focus();
          }}
          onEscapeKeyDown={keepOpen}
          onInteractOutside={keepOpen}
          {...(!description && { 'aria-describedby': undefined })}
        >
          <div className={css.inner}>
            <Dialog.Title asChild>
              <Mid as='h2' ref={titleRef} tabIndex={-1} className={css.title}>
                {title}
              </Mid>
            </Dialog.Title>
            {description && (
              <Dialog.Description className={cn(css.description, mark && css.marked)}>
                {mark && <span className={css.mark}>{mark}</span>}
                {description}
              </Dialog.Description>
            )}
            {children}
            {footer && <div className={css.footer}>{footer}</div>}
            {dismissible && <Dialog.Close className={css.close} aria-label='Close' />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
