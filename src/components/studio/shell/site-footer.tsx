import Link from 'next/link';

import { Button } from '../button';

import css from './shell.module.css';

/** Figma's Footer */
export function SiteFooter() {
  return (
    <footer className={css.footer}>
      <Link href='/' className={css.name}>
        Fundwell
      </Link>
      <nav aria-label='Footer'>
        <Button asChild look='ghost'>
          <Link href='/about-us'>About</Link>
        </Button>
        <Button asChild look='ghost'>
          <Link href='/support'>Support</Link>
        </Button>
        <Button asChild look='ghost'>
          <Link href='/terms'>Terms</Link>
        </Button>
        <Button asChild look='ghost'>
          <Link href='/privacy'>Privacy</Link>
        </Button>
      </nav>
    </footer>
  );
}
