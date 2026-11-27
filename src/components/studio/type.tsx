import type { ComponentProps, ElementType } from 'react';

import { cn } from '@/utils/cn';

import css from './type.module.css';

type TextProps<T extends ElementType> = Omit<ComponentProps<T>, 'as'> & { as?: T };

/** Figma's text styles as class names, for text that none of the components below fits. */
export const textStyle = {
  displayXl: css.displayXl,
  displayL: css.displayL,
  displayM: css.displayM,
  displayS: css.displayS,
  displayXs: css.displayXs,
  bodyL: css.bodyL,
  bodyM: css.bodyM,
  bodyS: css.bodyS,
  label: css.label,
  button: css.button,
};

/** The one huge line on a screen: Display XL, sized to the screen. */
export function Display<T extends ElementType = 'p'>({ as, className, ...props }: TextProps<T>) {
  const Tag: ElementType = as ?? 'p';
  return <Tag className={cn(css.display, className)} {...props} />;
}

/** Section headings and short statements: Display S. */
export function Mid<T extends ElementType = 'p'>({ as, className, ...props }: TextProps<T>) {
  const Tag: ElementType = as ?? 'p';
  return <Tag className={cn(css.mid, className)} {...props} />;
}

/** Quiet text. `small` is Body S (Body M on phones). */
export function Soft<T extends ElementType = 'p'>({
  as,
  small,
  className,
  ...props
}: TextProps<T> & { small?: boolean }) {
  const Tag: ElementType = as ?? 'p';
  return <Tag className={cn(css.soft, small && css.small, className)} {...props} />;
}
