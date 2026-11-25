import { Children, type ComponentProps, type ElementType, Fragment, type ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { srOnly } from './theme';

import css from './type.module.css';

type TextProps<T extends ElementType> = Omit<ComponentProps<T>, 'as'> & { as?: T };

/** Display text with every 1's foot trimmed. Screen readers and no-CSS readers get the plain text. */
function trimOnes(text: string): ReactNode {
  if (!text.includes('1')) return text;

  return (
    <>
      <span className={srOnly}>{text}</span>
      <span aria-hidden='true'>
        {text.split(/(1)/).map((part, i) =>
          part === '1' ? (
            <span key={i} className={css.one}>
              1
            </span>
          ) : (
            part
          )
        )}
      </span>
    </>
  );
}

/** The one huge line on a screen. Plain text and numbers passed as children get the display 1. */
export function Display<T extends ElementType = 'p'>({ as, className, children, ...props }: TextProps<T>) {
  const Tag: ElementType = as ?? 'p';

  return (
    <Tag className={cn(css.display, className)} {...props}>
      {Children.map(children as ReactNode, (child) =>
        typeof child === 'string' || typeof child === 'number' ? <Fragment>{trimOnes(String(child))}</Fragment> : child
      )}
    </Tag>
  );
}

/** Section headings and short statements. */
export function Mid<T extends ElementType = 'p'>({ as, className, ...props }: TextProps<T>) {
  const Tag: ElementType = as ?? 'p';
  return <Tag className={cn(css.mid, className)} {...props} />;
}

/** Quiet text. */
export function Soft<T extends ElementType = 'p'>({
  as,
  small,
  className,
  ...props
}: TextProps<T> & { small?: boolean }) {
  const Tag: ElementType = as ?? 'p';
  return <Tag className={cn(css.soft, small && css.small, className)} {...props} />;
}
