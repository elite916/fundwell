import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '../button';

import css from './shell.module.css';

interface SiteHeaderProps {
  links: { href: string; label: string }[];
  /** After the links, for example a log out button. It takes the last link's Secondary look itself. */
  children?: ReactNode;
}

/** Figma's Nav: Fundwell's own header. Ghost links, and the last one Secondary (Ghost on phones). */
export function SiteHeader({ links, children }: SiteHeaderProps) {
  return (
    <header className={css.header}>
      <Link href='/' className={css.name}>
        Fundwell
      </Link>
      <nav aria-label='Main' className={css.nav}>
        {links.map(({ href, label }, index) => (
          <Button key={href} asChild look={!children && index === links.length - 1 ? 'secondary' : 'ghost'}>
            <Link href={href}>{label}</Link>
          </Button>
        ))}
        {children}
      </nav>
    </header>
  );
}
