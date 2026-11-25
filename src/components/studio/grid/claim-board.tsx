'use client';

import type { ReactNode } from 'react';

import { BoardFrame } from './board-frame';
import { type BoardData, buildGrid, type Cell, type GridSquare } from './model';
import { pressableClass, tileClass } from './tile';
import { useBoardKeys } from './use-board-keys';

interface ClaimBoardProps<T extends GridSquare = GridSquare> extends BoardData<T> {
  /** True while the contest is open. Otherwise available squares can be reached but not pressed. */
  canClaim: boolean;
  /** An available square, while `canClaim`. */
  onClaim: (square: T) => void;
  /** A claimed square, for example to find that person's squares. Without it, claimed squares can't be pressed. */
  onSelectClaimed?: (square: T) => void;
  /** The line above the board that says which team runs which way. */
  axisNote?: ReactNode;
  className?: string;
}

/** The board to use: one tab stop, arrow keys to move, Enter or Space to press. */
export function ClaimBoard<T extends GridSquare>({
  canClaim,
  onClaim,
  onSelectClaimed,
  axisNote,
  className,
  ...data
}: ClaimBoardProps<T>) {
  const { tableRef, tabStop, setTabStop, handleKeyDown } = useBoardKeys();

  const actionFor = ({ square, payment }: Cell<T>): (() => void) | undefined => {
    if (!square) return undefined;
    if (payment === 'available') return canClaim ? () => onClaim(square) : undefined;
    return onSelectClaimed && (() => onSelectClaimed(square));
  };

  return (
    <BoardFrame
      grid={buildGrid(data)}
      rowTeamName={data.rowTeamName}
      colTeamName={data.colTeamName}
      axisNote={axisNote}
      className={className}
      tableRef={tableRef}
      tableProps={{
        role: 'grid',
        'aria-label': `Squares, ${data.rowTeamName} down and ${data.colTeamName} across`,
        onKeyDown: handleKeyDown,
      }}
      renderCell={(cell) => {
        const index = cell.row * 10 + cell.col;
        const action = actionFor(cell);
        const isAvailable = cell.payment === 'available';
        return (
          <button
            type='button'
            data-cell={index}
            tabIndex={index === tabStop ? 0 : -1}
            aria-label={cell.label}
            aria-disabled={!action || undefined}
            aria-pressed={!isAvailable && action ? cell.found : undefined}
            className={tileClass(cell, action && pressableClass(isAvailable))}
            onFocus={() => setTabStop(index)}
            onClick={(event) => {
              // Safari doesn't focus a pressed button; a closing sheet has to come back to this one.
              event.currentTarget.focus();
              action?.();
            }}
          >
            {cell.initials}
          </button>
        );
      }}
    />
  );
}
