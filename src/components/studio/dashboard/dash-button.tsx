import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';
import { Slot } from '@radix-ui/react-slot';

import css from './dash.module.css';

interface DashButtonProps extends ComponentProps<'button'> {
  /** `main` is the main action, one per view. `quiet` and `light` are outlined, `link` is underlined text. */
  look?: 'main' | 'quiet' | 'light' | 'link';
  /** Put the look on the child instead, for example a next/link. */
  asChild?: boolean;
}

export function DashButton({ look = 'main', asChild, className, type, ...props }: DashButtonProps) {
  const looks = cn(look === 'link' ? css.link : css.button, look !== 'link' && look !== 'main' && css[look], className);

  if (asChild) return <Slot className={looks} {...props} />;

  return <button type={type ?? 'button'} className={looks} {...props} />;
}

/** A round button that only shows an icon. The label is what screen readers hear. */
export function IconButton({ label, className, ...props }: ComponentProps<'button'> & { label: string }) {
  return <button type='button' aria-label={label} className={cn(css.icon, className)} {...props} />;
}

/** A text input in the dashboard look. Give it a label. */
export function DashInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(css.input, className)} {...props} />;
}

/** A checkbox. Put it in a `<label>`. */
export function DashCheckbox({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return <input type='checkbox' className={cn(css.box, className)} {...props} />;
}
