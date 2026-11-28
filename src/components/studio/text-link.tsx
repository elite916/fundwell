import Link from 'next/link';
import type { ComponentProps } from 'react';

import { Button } from './button';

interface TextLinkProps extends ComponentProps<typeof Link> {
  /** `link` is underlined text. `button` is the main action. */
  look?: 'button' | 'link';
}

/** A link to another page. Use `Button` for actions on this one. */
export function TextLink({ look = 'link', className, ...props }: TextLinkProps) {
  return (
    <Button asChild look={look} className={className}>
      <Link {...props} />
    </Button>
  );
}
