import localFont from 'next/font/local';

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

export const toastFont = hostGrotesk.variable;
