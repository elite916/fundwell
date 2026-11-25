import { winningPosition } from '@/components/studio/grid/model';

/** The square a score lands on, or null when the numbers aren't in or no square matches. */
export function findWinningSquare<T extends { row_index: number; col_index: number }>(
  squares: readonly T[],
  rowNumbers: readonly number[] | null | undefined,
  colNumbers: readonly number[] | null | undefined,
  rowScore: number,
  colScore: number
): T | null {
  const position = winningPosition(rowNumbers, colNumbers, rowScore, colScore);
  if (!position) return null;
  return squares.find((sq) => sq.row_index === position.row && sq.col_index === position.col) ?? null;
}
