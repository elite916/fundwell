import type { ReactNode } from 'react';

import { Mid, Soft } from './type';

interface StatusTextProps {
  /** What just happened, or where things stand. */
  children: ReactNode;
  /** A quiet second line. */
  detail?: ReactNode;
  /** `soft` for a hint, `strong` for news. */
  tone?: 'strong' | 'soft';
  /** Read changes out to screen readers. Keep it mounted and change the text. */
  live?: boolean;
  className?: string;
}

/** Status in words, with no badge: "Robin Sample won halftime", "Nobody claimed that square." */
export function StatusText({ children, detail, tone = 'strong', live, className }: StatusTextProps) {
  const Line = tone === 'strong' ? Mid : Soft;

  return (
    <div role={live ? 'status' : undefined} className={className}>
      {children && <Line as='p'>{children}</Line>}
      {detail && <Soft as='p'>{detail}</Soft>}
    </div>
  );
}
