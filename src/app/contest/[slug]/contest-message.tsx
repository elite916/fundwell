import type { ReactNode } from 'react';

import { StudioPage } from '@/components/studio/shell/studio-page';
import { Display, Soft } from '@/components/studio/type';

import css from './contest.module.css';

interface ContestMessageProps {
  header?: ReactNode;
  title: string;
  children: ReactNode;
  action: ReactNode;
  /** A last quiet line, for example an error id. */
  note?: ReactNode;
}

/** A contest page that has no contest to show. */
export function ContestMessage({ header, title, children, action, note }: ContestMessageProps) {
  return (
    <StudioPage header={header}>
      <div className={css.message}>
        <Display as='h1' className={css.messageTitle}>
          {title}
        </Display>
        <div className={css.messageText}>
          <Soft>{children}</Soft>
          <div className={css.messageActions}>{action}</div>
          {note && <Soft small>{note}</Soft>}
        </div>
      </div>
    </StudioPage>
  );
}
