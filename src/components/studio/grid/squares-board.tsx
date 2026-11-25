import type { ReactNode } from 'react';

import { srOnly } from '../theme';

import { BoardFrame } from './board-frame';
import { type BoardData, buildGrid, type GridSquare } from './model';
import { Tile } from './tile';

interface SquaresBoardProps<T extends GridSquare = GridSquare> extends BoardData<T> {
  /** The line above the board that says which team runs which way. */
  axisNote?: ReactNode;
  className?: string;
}

/** The board to look at. No JavaScript, no tab stops: a table screen readers can walk. */
export function SquaresBoard<T extends GridSquare>({ axisNote, className, ...data }: SquaresBoardProps<T>) {
  return (
    <BoardFrame
      grid={buildGrid(data)}
      rowTeamName={data.rowTeamName}
      colTeamName={data.colTeamName}
      axisNote={axisNote}
      className={className}
      renderCell={({ payment, won, found, chosen, initials, label }) => (
        <>
          <Tile payment={payment} won={won} found={found} chosen={chosen}>
            {initials}
          </Tile>
          <span className={srOnly}>{label}</span>
        </>
      )}
    />
  );
}
