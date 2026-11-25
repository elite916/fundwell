'use client';

import { QuarterDisplayNames } from '@/features/contests/constants/status';

import { BoardFrame } from './board-frame';
import { type BoardData, buildGrid, type Cell, claimantName, type GridSquare, WINNER_LABEL, winnersOf } from './model';
import { tileClass } from './tile';
import { useBoardKeys } from './use-board-keys';

import css from './tile.module.css';

interface ManageBoardProps<T extends GridSquare = GridSquare> extends BoardData<T> {
  /** Any square, claimed or not. */
  onSelect: (square: T) => void;
  className?: string;
}

/** The organizer's board: every square opens. One tab stop, arrow keys to move, Enter or Space to press. */
export function ManageBoard<T extends GridSquare>({ onSelect, className, ...data }: ManageBoardProps<T>) {
  const { tableRef, tabStop, setTabStop, handleKeyDown } = useBoardKeys();
  const { quartersById } = winnersOf(data.scores);

  // What a mouse sees on hover
  const titleOf = ({ square, payment }: Cell<T>) => {
    const parts =
      payment === 'available' || !square
        ? ['Available']
        : [`${claimantName(square)} (${payment === 'paid' ? 'Paid' : 'Pending Payment'})`];
    const quarters = (square && quartersById.get(square.id)) ?? [];
    return [...parts, ...quarters.map((quarter) => `${QuarterDisplayNames[quarter]} ${WINNER_LABEL}`)].join(', ');
  };

  return (
    <BoardFrame
      grid={buildGrid(data)}
      rowTeamName={data.rowTeamName}
      colTeamName={data.colTeamName}
      numberPlaceholder='?'
      className={className}
      tableRef={tableRef}
      tableProps={{
        role: 'grid',
        'aria-label': `Squares, ${data.rowTeamName} down and ${data.colTeamName} across`,
        onKeyDown: handleKeyDown,
      }}
      renderCell={(cell) => {
        const index = cell.row * 10 + cell.col;
        const { square } = cell;
        return (
          <button
            type='button'
            data-cell={index}
            tabIndex={index === tabStop ? 0 : -1}
            // Starts with the letters on the tile, so people who use their voice can say what they see
            aria-label={[cell.initials, cell.label].filter(Boolean).join(', ')}
            title={titleOf(cell)}
            className={tileClass(cell, css.manageable)}
            onFocus={() => setTabStop(index)}
            onClick={(event) => {
              // Safari doesn't focus a pressed button; a closing dialog has to come back to this one.
              event.currentTarget.focus();
              if (square) onSelect(square);
            }}
          >
            {cell.initials}
          </button>
        );
      }}
    />
  );
}
