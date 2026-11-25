'use client';

import { type KeyboardEvent, type ReactNode, useRef, useState } from 'react';

import { BoardFrame } from './board-frame';
import { type BoardData, buildGrid, type Cell, type GridSquare } from './model';
import { pressableClass, tileClass } from './tile';

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
  const tableRef = useRef<HTMLTableElement>(null);
  const [tabStop, setTabStop] = useState(0);

  const actionFor = ({ square, payment }: Cell<T>): (() => void) | undefined => {
    if (!square) return undefined;
    if (payment === 'available') return canClaim ? () => onClaim(square) : undefined;
    return onSelectClaimed && (() => onSelectClaimed(square));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const current = Number((event.target as HTMLElement).dataset.cell);
    if (Number.isNaN(current)) return;
    const row = Math.floor(current / 10);
    const col = current % 10;
    const next = {
      ArrowRight: col < 9 ? current + 1 : current,
      ArrowLeft: col > 0 ? current - 1 : current,
      ArrowDown: row < 9 ? current + 10 : current,
      ArrowUp: row > 0 ? current - 10 : current,
      Home: event.ctrlKey ? 0 : row * 10,
      End: event.ctrlKey ? 99 : row * 10 + 9,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    tableRef.current?.querySelector<HTMLElement>(`[data-cell='${next}']`)?.focus();
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
