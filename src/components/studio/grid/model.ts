import { QuarterDisplayNames } from '@/features/contests/constants/status';
import type { GridSquare } from '@/features/contests/queries/get-squares';
import type { GameQuarter, PaymentStatus, Score } from '@/features/contests/types';

import type { TileState } from './tile';

export type { GridSquare };

const SIZE = 10;
const QUARTERS: GameQuarter[] = ['q1', 'q2', 'q3', 'final'];

/** Shown in the legend and read out on every tile. */
export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  available: 'Available',
  pending: 'Pending',
  paid: 'Paid',
};
export const WINNER_LABEL = 'Winner';
export const PAST_WINNER_LABEL = 'Past winner';

export type GridScore = Pick<Score, 'quarter' | 'winning_square_id'>;

/** What both boards draw. Fields match the contest and its squares and scores as the app loads them. */
export interface BoardData<T extends GridSquare = GridSquare> {
  squares: readonly T[];
  rowTeamName: string;
  colTeamName: string;
  /** Ten digits each, or null until the numbers are in. */
  rowNumbers?: readonly number[] | null;
  colNumbers?: readonly number[] | null;
  /** Saved scores, any order. The latest quarter is the winner; the ones before it are earlier winners. */
  scores?: readonly GridScore[];
  /** Replaces "Halftime Winner" on the latest winner, for example while a score is only typed in. */
  winnerLabel?: string;
  /** Marks every square claimed under this name. */
  findName?: string | null;
  /** The square being claimed right now. */
  chosenSquareId?: string | null;
}

export interface Cell<T extends GridSquare = GridSquare> extends TileState {
  row: number;
  col: number;
  square: T | null;
  initials: string;
  label: string;
}

export interface Grid<T extends GridSquare = GridSquare> {
  rows: Cell<T>[][];
  rowNumbers: readonly number[] | null;
  colNumbers: readonly number[] | null;
  winner: { row: number; col: number } | null;
}

/** "Jamie Example", or an empty string for an unclaimed square. */
export function claimantName(square: GridSquare): string {
  return [square.claimant_first_name, square.claimant_last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

/** Names are typed by hand: ignore case and extra spaces when matching them. */
function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Everyone with a square, once each, A to Z, for a "Find your squares" list. */
export function claimantNames(squares: readonly GridSquare[]): string[] {
  const names = new Map<string, string>();
  for (const square of squares) {
    const name = claimantName(square);
    if (name && !names.has(nameKey(name))) names.set(nameKey(name), name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

/** The squares claimed under a name. */
export function squaresOf<T extends GridSquare>(squares: readonly T[], name: string | null | undefined): T[] {
  const key = nameKey(name ?? '');
  return key ? squares.filter((square) => nameKey(claimantName(square)) === key) : [];
}

/**
 * Where a score lands: the row and column whose numbers are the last digits of the two scores.
 * Same rule as `saveScores`. Null until both sets of numbers are in.
 */
export function winningPosition(
  rowNumbers: readonly number[] | null | undefined,
  colNumbers: readonly number[] | null | undefined,
  rowScore: number,
  colScore: number
): { row: number; col: number } | null {
  const row = rowNumbers?.indexOf(rowScore % 10) ?? -1;
  const col = colNumbers?.indexOf(colScore % 10) ?? -1;
  return row < 0 || col < 0 ? null : { row, col };
}

/** Splits saved scores into the latest quarter's winner and the quarters each square won. */
export function winnersOf(scores: readonly GridScore[] = []): {
  latestId: string | null;
  quartersById: Map<string, GameQuarter[]>;
} {
  const played = QUARTERS.flatMap((quarter) => scores.find((score) => score.quarter === quarter) ?? []);
  const quartersById = new Map<string, GameQuarter[]>();
  for (const { quarter, winning_square_id: id } of played) {
    if (id) quartersById.set(id, [...(quartersById.get(id) ?? []), quarter]);
  }
  return { latestId: played.at(-1)?.winning_square_id ?? null, quartersById };
}

/** Everything the boards need to draw, worked out once. */
export function buildGrid<T extends GridSquare>(data: BoardData<T>): Grid<T> {
  const { squares, rowTeamName, colTeamName, scores, winnerLabel, findName, chosenSquareId } = data;
  const rowNumbers = data.rowNumbers?.length === SIZE ? data.rowNumbers : null;
  const colNumbers = data.colNumbers?.length === SIZE ? data.colNumbers : null;
  const { latestId, quartersById } = winnersOf(scores);
  const latestQuarter = latestId ? quartersById.get(latestId)?.at(-1) : undefined;
  const found = new Set(squaresOf(squares, findName).map((square) => square.id));
  const byPosition = new Map(squares.map((square) => [`${square.row_index}-${square.col_index}`, square]));
  let winner: Grid['winner'] = null;

  const rows = Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col): Cell<T> => {
      const square = byPosition.get(`${row}-${col}`) ?? null;
      const payment = square?.payment_status ?? 'available';
      const name = square ? claimantName(square) : '';
      const isLatest = !!square && square.id === latestId;
      const quarters = square ? (quartersById.get(square.id) ?? []) : [];
      if (isLatest) winner = { row, col };

      const label = [`Row ${row + 1}, column ${col + 1}`];
      if (rowNumbers && colNumbers) {
        label.push(`${rowTeamName} ${rowNumbers[row]}, ${colTeamName} ${colNumbers[col]}`);
      }
      if (payment !== 'available' && name) label.push(name);
      label.push(PAYMENT_LABELS[payment]);
      for (const quarter of quarters) {
        const isNow = isLatest && quarter === latestQuarter;
        label.push(isNow && winnerLabel ? winnerLabel : `${QuarterDisplayNames[quarter]} ${WINNER_LABEL}`);
      }
      const chosen = !!square && square.id === chosenSquareId;
      if (chosen) label.push('your choice');

      return {
        row,
        col,
        square,
        payment,
        won: isLatest ? 'winner' : quarters.length > 0 ? 'past' : null,
        found: !!square && found.has(square.id),
        chosen,
        initials: payment === 'available' ? '' : initialsOf(square),
        label: label.join(', '),
      };
    })
  );

  return { rows, rowNumbers, colNumbers, winner };
}

/** "JE", from the claimant's names. */
export function initialsOf(square: GridSquare | null): string {
  return [square?.claimant_first_name, square?.claimant_last_name]
    .map((part) => [...(part?.trim() ?? '')][0]?.toUpperCase() ?? '')
    .join('');
}
