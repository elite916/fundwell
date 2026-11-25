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

// Same font, latin-ext, for names like "Łukasz Dvořák". Not preloaded: browsers fetch it only when a page uses one of
// these characters (the range is Fontsource's), which is also why it comes before the latin file in `font-family`.
const hostGroteskExt = localFont({
  src: './fonts/host-grotesk-latin-ext-wght-normal.woff2',
  weight: '300 800',
  style: 'normal',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
    },
  ],
  variable: '--font-studio-ext',
});

/** Turns the theme on for an element and everything in it. Portals (dialogs) need it again on their own content. */
export const studioTheme = cn(hostGrotesk.variable, hostGroteskExt.variable, css.studio);

/** A full page in the theme. */
export const studioPage = cn(studioTheme, css.page);

/** Put on page text that a side sheet covers on wide screens, so it fades out while the sheet is open. */
export const underSheet = css.underSheet;

export const srOnly = css.srOnly;
