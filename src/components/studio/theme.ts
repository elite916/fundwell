import localFont from 'next/font/local';

import { cn } from '@/utils/cn';

import css from './theme.module.css';

// Host Grotesk, latin, weights 300 to 800. SIL Open Font License: ./fonts/HostGrotesk-OFL.txt
const hostGrotesk = localFont({
  src: './fonts/host-grotesk-latin-wght-normal.woff2',
  weight: '300 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-studio',
});

/** Turns the theme on for an element and everything in it. Portals (dialogs) need it again on their own content. */
export const studioTheme = cn(hostGrotesk.variable, css.studio);

/** A full page in the theme. */
export const studioPage = cn(studioTheme, css.page);

/** Put on page text that a side sheet covers on wide screens, so it fades out while the sheet is open. */
export const underSheet = css.underSheet;

export const srOnly = css.srOnly;
