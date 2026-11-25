import Link from 'next/link';

import css from './shell.module.css';

export function SiteFooter() {
  return (
    <footer className={css.footer}>
      <Link href='/'>Fundwell</Link>
      <nav aria-label='Footer'>
        <Link href='/about-us'>About</Link>
        <Link href='/support'>Support</Link>
        <Link href='/terms'>Terms</Link>
        <Link href='/privacy'>Privacy</Link>
      </nav>
    </footer>
  );
}
