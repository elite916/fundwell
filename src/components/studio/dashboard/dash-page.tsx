import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { studioTheme } from '../theme';

import css from './dash.module.css';

/** The dashboard's version of `studioTheme`. Portals (dialogs, menus) need it again on their own content. */
export const dashTheme = cn(studioTheme, css.dash);

/**
 * Around everything in a dashboard page or its loading state. Turns the new look on for that page: the shell keeps
 * today's dark background behind any page without it.
 */
export function DashPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-dash-page='' className={cn(dashTheme, css.page, className)}>
      {children}
    </div>
  );
}

/** "Back to Dashboard" */
export function BackLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link className={cn(css.back, className)} {...props} />;
}

interface PageHeadProps {
  title: ReactNode;
  /** Short facts under the title, side by side. */
  sub?: ReactNode[];
  /** Buttons on the right, under the title on phones. */
  children?: ReactNode;
}

export function PageHead({ title, sub, children }: PageHeadProps) {
  return (
    <div className={css.head}>
      <div>
        <h1>{title}</h1>
        {sub && (
          <p className={css.sub}>
            {sub.map((fact, i) => (
              <span key={i}>{fact}</span>
            ))}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn(css.panel, className)} {...props} />;
}

interface TagProps extends ComponentProps<'span'> {
  /** `now` is the lime one, for what is happening now. `owes` is outlined, for a payment still to come. */
  tone?: 'quiet' | 'now' | 'owes';
}

export function Tag({ tone = 'quiet', className, ...props }: TagProps) {
  return <span className={cn(css.tag, tone !== 'quiet' && css[tone], className)} {...props} />;
}

/** A shaded line of text. `warn` is outlined. */
export function Note({ tone, className, ...props }: ComponentProps<'p'> & { tone?: 'warn' }) {
  return <p className={cn(css.note, tone && css.warn, className)} {...props} />;
}

/** A page that is still loading: "Loading contest..." */
export function DashWait({ text }: { text: string }) {
  return (
    <DashPage>
      <div role='status' className={css.wait}>
        <span aria-hidden='true' className={css.blocks}>
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} />
          ))}
        </span>
        <p>{text}</p>
      </div>
    </DashPage>
  );
}

interface DashProblemProps {
  title: ReactNode;
  text: ReactNode;
  /** Small print under the buttons. */
  fine?: ReactNode;
  /** Buttons. */
  children?: ReactNode;
}

/** A page with nothing to show because something is wrong. */
export function DashProblem({ title, text, fine, children }: DashProblemProps) {
  return (
    <div className={css.empty}>
      <h1>{title}</h1>
      <p className={css.soft}>{text}</p>
      {children && <div className={css.buttons}>{children}</div>}
      {fine && <p className={css.fine}>{fine}</p>}
    </div>
  );
}
