import type { ReactNode } from 'react';

import type { PaymentStatus } from '@/features/contests/types';
import { cn } from '@/utils/cn';

import css from './tile.module.css';

export interface TileState {
  payment: PaymentStatus;
  /** `winner` is the latest one, `past` an earlier quarter's. */
  won?: 'winner' | 'past' | null;
  /** One of the squares being looked for by name. */
  found?: boolean;
  /** The square being claimed right now. */
  chosen?: boolean;
}

/** Class names for a tile in a state. Order in tile.module.css decides which mark wins. */
export function tileClass({ payment, won, found, chosen }: TileState, className?: string): string {
  return cn(
    css.tile,
    payment === 'paid' && css.paid,
    payment === 'pending' && css.pending,
    found && css.found,
    won === 'past' && css.past,
    won === 'winner' && css.winner,
    chosen && css.chosen,
    className
  );
}

/** For tiles that can be pressed. `claimable` ones show the Mine ring under a mouse. */
export function pressableClass(claimable: boolean): string {
  return cn(css.pressable, claimable && css.claimable);
}

interface TileProps extends TileState {
  children?: ReactNode;
  className?: string;
}

/** One tile, drawn only. Put the words for screen readers next to it. */
export function Tile({ children, className, ...state }: TileProps) {
  return (
    <span aria-hidden='true' className={tileClass(state, className)}>
      {children}
    </span>
  );
}

/** A tile the size of a line of text, for legends and sheet headings. Home's legend puts example initials in it. */
export function TileChip({ children, ...state }: TileState & { children?: ReactNode }) {
  return (
    <span aria-hidden='true' className={tileClass(state, css.chip)}>
      {children}
    </span>
  );
}
