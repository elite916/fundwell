'use client';

import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from 'react';

import { cn } from '@/utils/cn';

import { Mid } from './type';

import css from './sheet.module.css';

interface SideCardProps {
  /** Change it when the contents are replaced: focus moves to the new title. */
  step: string;
  title: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Figma's sheets as a card beside the page on wide screens (the claim form, the pledge form, the share sheet). Not a
 * dialog: the page stays usable. Focus starts on the title and goes back to what opened it on Close or Escape.
 */
export function SideCard({ step, title, onClose, className, children }: SideCardProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<Element | null>(null);

  // Back to the opener once the card goes, unless focus has already moved on (another square was pressed)
  useEffect(() => {
    openerRef.current ??= document.activeElement;
    const opener = openerRef.current;
    return () => {
      const isLost = !document.activeElement || document.activeElement === document.body;
      if (isLost && opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  useEffect(() => {
    titleRef.current?.focus();
  }, [step]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
  };

  return (
    <section aria-labelledby={titleId} className={cn(css.card, className)} onKeyDown={handleKeyDown}>
      <div className={css.cardHeading}>
        <Mid as='h2' id={titleId} ref={titleRef} tabIndex={-1} className={css.cardTitle}>
          {title}
        </Mid>
        <button type='button' className={css.cardClose} aria-label='Close' onClick={onClose} />
      </div>
      {children}
    </section>
  );
}
