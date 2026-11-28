import type { ReactNode, Ref, TableHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

import { srOnly } from '../theme';

import type { Cell, Grid, GridSquare } from './model';

import css from './board.module.css';

interface BoardFrameProps<T extends GridSquare> {
  grid: Grid<T>;
  rowTeamName: string;
  colTeamName: string;
  axisNote?: ReactNode;
  /** Shown in place of each number until the numbers are in. Without it the axes are left out until then. */
  numberPlaceholder?: string;
  className?: string;
  renderCell: (cell: Cell<T>) => ReactNode;
  tableRef?: Ref<HTMLTableElement>;
  tableProps?: TableHTMLAttributes<HTMLTableElement>;
}

/** The table of squares and its numbers. Shared by both boards; use one of those instead. */
export function BoardFrame<T extends GridSquare>({
  grid,
  rowTeamName,
  colTeamName,
  axisNote,
  numberPlaceholder,
  className,
  renderCell,
  tableRef,
  tableProps,
}: BoardFrameProps<T>) {
  const { rows, rowNumbers, colNumbers, winner } = grid;
  const hasNumbers = !!rowNumbers && !!colNumbers;
  const hasAxes = hasNumbers || !!numberPlaceholder;
  const placeholder = numberPlaceholder && <span aria-hidden='true'>{numberPlaceholder}</span>;

  return (
    <div className={cn(css.wrap, className)}>
      {axisNote && <p className={css.axis}>{axisNote}</p>}
      <div className={css.board}>
        <table ref={tableRef} className={cn(css.table, !hasAxes && css.noNumbers)} {...tableProps}>
          <caption className={srOnly}>
            Squares, {rowTeamName} down and {colTeamName} across
          </caption>
          <thead>
            <tr>
              <td />
              {rows[0].map(({ col }) => (
                <th key={col} scope='col' className={winner?.col === col ? css.on : undefined}>
                  {hasNumbers ? (
                    colNumbers[col]
                  ) : (
                    <>
                      {placeholder}
                      <span className={srOnly}>Column {col + 1}</span>
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, row) => (
              <tr key={row}>
                <th scope='row' className={winner?.row === row ? css.on : undefined}>
                  {hasNumbers ? (
                    rowNumbers[row]
                  ) : (
                    <>
                      {placeholder}
                      <span className={srOnly}>Row {row + 1}</span>
                    </>
                  )}
                </th>
                {cells.map((cell) => (
                  <td key={cell.col}>{renderCell(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
