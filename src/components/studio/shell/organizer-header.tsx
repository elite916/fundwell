import Image from 'next/image';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { underSheet } from '../theme';

import css from './shell.module.css';

interface OrganizerHeaderProps {
  contestName: string;
  /** Second line: the organizer's own description. */
  description?: ReactNode;
  logoUrl?: string | null;
  /** On the right, for example a Share button. */
  action?: ReactNode;
}

/** The first letters of a name's first two words. */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0].toUpperCase())
    .join('');
}

/** Figma's Contest header: a bar in the team color, with the organizer's logo or the contest's initials on the accent. */
export function OrganizerHeader({ contestName, description, logoUrl, action }: OrganizerHeaderProps) {
  return (
    <header className={css.organizerBar}>
      <span aria-hidden='true' className={cn(css.avatar, underSheet)}>
        {logoUrl ? <Image src={logoUrl} alt='' width={112} height={112} /> : initialsOf(contestName)}
      </span>
      <h1 className={cn(css.contest, underSheet)}>{contestName}</h1>
      {description && <p className={cn(css.description, underSheet)}>{description}</p>}
      {action && <div className={css.action}>{action}</div>}
    </header>
  );
}
