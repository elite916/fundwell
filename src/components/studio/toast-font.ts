import localFont from 'next/font/local';

import { cn } from '@/utils/cn';

/**
 * The studio font for things in the root layout (messages), which every page has. Not preloaded, so a page outside
 * the theme doesn't download it: the browser only fetches it once something uses it.
 */
const hostGrotesk = localFont({
  src: './fonts/host-grotesk-latin-wght-normal.woff2',
  weight: '300 800',
  style: 'normal',
  display: 'swap',
  preload: false,
  variable: '--font-studio',
});

// Same as in ./theme.ts, which says more: names like "Łukasz Dvořák"
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

export const toastFont = cn(hostGrotesk.variable, hostGroteskExt.variable);
