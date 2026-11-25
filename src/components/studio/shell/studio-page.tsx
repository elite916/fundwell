import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { studioPage } from '../theme';

import { SiteFooter } from './site-footer';

import css from './shell.module.css';

interface StudioPageProps {
  children: ReactNode;
  /** Laid over the top of the page: leave about 96px clear. */
  header?: ReactNode;
  /** Defaults to the site footer. Pass null for none. */
  footer?: ReactNode;
  className?: string;
  /** The organizer's colors, from `organizerColors()`. */
  style?: CSSProperties;
}

/** The page around everything: theme, font, skip link, header, main, footer. */
export function StudioPage({ children, header, footer = <SiteFooter />, className, style }: StudioPageProps) {
  return (
    <div className={cn(studioPage, className)} style={style}>
      <a className={css.skip} href='#main'>
        Skip to content
      </a>
      {header}
      <main id='main' tabIndex={-1}>
        {children}
      </main>
      {footer}
    </div>
  );
}
