import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import css from './shell.module.css';

interface SiteHeaderProps {
  links: { href: string; label: string }[];
  /** After the links, for example a log out button. */
  children?: ReactNode;
}

/** Fundwell's own header. */
export function SiteHeader({ links, children }: SiteHeaderProps) {
  return (
    <header className={cn(css.header, css.site)}>
      <Link href='/' className={css.name}>
        Fundwell
      </Link>
      <nav aria-label='Main' className={css.nav}>
        {links.map(({ href, label }) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
        {children}
      </nav>
    </header>
  );
}
