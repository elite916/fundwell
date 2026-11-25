import Image from 'next/image';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { underSheet } from '../theme';

import css from './shell.module.css';

interface OrganizerHeaderProps {
  contestName: string;
  /** Second line, hidden on phones: "Hosted by …" */
  host?: ReactNode;
  logoUrl?: string | null;
  /** On the right, for example a Share button. */
  action?: ReactNode;
}

/** A contest page's header: the organizer's logo, or the contest's initials on their color. */
export function OrganizerHeader({ contestName, host, logoUrl, action }: OrganizerHeaderProps) {
  const initials = contestName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0].toUpperCase())
    .join('');

  return (
    <header className={css.header}>
      <div className={cn(css.organizer, underSheet)}>
        <span aria-hidden='true' className={css.avatar}>
          {logoUrl ? <Image src={logoUrl} alt='' width={88} height={88} /> : initials}
        </span>
        <div>
          <h1 className={css.contest}>{contestName}</h1>
          {host && <p className={css.host}>{host}</p>}
        </div>
      </div>
      {action && <div className={css.action}>{action}</div>}
    </header>
  );
}
