import { cn } from '@/utils/cn';

import { PAYMENT_LABELS, WINNER_LABEL } from './model';
import { TileChip } from './tile';

import css from './board.module.css';

interface BoardLegendProps {
  /** Show the winner marks, once a score is in. */
  hasWinner?: boolean;
  /** Also show the mark for an earlier quarter's winner. */
  hasEarlierWinner?: boolean;
  className?: string;
}

/** What the tiles mean. */
export function BoardLegend({ hasWinner, hasEarlierWinner, className }: BoardLegendProps) {
  return (
    <ul className={cn(css.legend, className)}>
      <li>
        <TileChip payment='available' /> {PAYMENT_LABELS.available}
      </li>
      <li>
        <TileChip payment='pending' /> {PAYMENT_LABELS.pending}
      </li>
      <li>
        <TileChip payment='paid' /> {PAYMENT_LABELS.paid}
      </li>
      {hasWinner && (
        <li>
          <TileChip payment='paid' won='winner' />
          {hasEarlierWinner && <TileChip payment='paid' won='past' />} {WINNER_LABEL}
        </li>
      )}
    </ul>
  );
}
