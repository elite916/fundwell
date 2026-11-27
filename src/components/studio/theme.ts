import { cn } from '@/utils/cn';

import css from './theme.module.css';

/**
 * Turns the theme on for an element and everything in it. Portals (dialogs) need it again on their own content. The
 * fonts come from the root layout.
 */
export const studioTheme = css.studio;

/** A full page in the theme. */
export const studioPage = cn(studioTheme, css.page);

/** Put on page text that a side sheet covers on wide screens, so it fades out while the sheet is open. */
export const underSheet = css.underSheet;

export const srOnly = css.srOnly;
