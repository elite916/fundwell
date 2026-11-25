// Made-up data for the review pages. Nothing here is real or saved.
import type { GridScore, GridSquare } from '@/components/studio/grid/model';

export const ROW_NUMBERS = [7, 2, 9, 0, 4, 1, 8, 3, 6, 5];
export const COL_NUMBERS = [3, 8, 0, 5, 1, 9, 6, 2, 7, 4];
export const ROW_TEAM = 'Otters';
export const COL_TEAM = 'Herons';
export const CONTEST_NAME = 'Example Contest for a Pretend Team';

const NAMES = [
  'Jamie Example',
  'Robin Sample',
  'Casey Mock',
  'Drew Placeholder',
  'Alex Demo',
  'Sam Specimen',
  'Morgan Test',
  'Riley Draft',
  'Avery Fable',
  'Blake Mockup',
  'Dana Dummy',
  'Ellis Faux',
  'Frankie Pretend',
  'Harper Trial',
  'Indy Proxy',
  'Jules Filler',
  'Kai Template',
  'Lee Fiction',
  'Noel Practice',
  'Taylor Stub',
];

const at = (rowScore: number, colScore: number) =>
  ROW_NUMBERS.indexOf(rowScore % 10) * 10 + COL_NUMBERS.indexOf(colScore % 10);

const WINNING = [at(7, 0), at(20, 7), at(27, 7), at(31, 14)];

/** A hundred squares: `sold` of them claimed, the first `paid` of those paid. */
export function exampleSquares(sold: number, paid: number): GridSquare[] {
  const order = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => ((a * 37 + 11) % 101) - ((b * 37 + 11) % 101));
  const first = WINNING.slice(0, 3);
  const rank = new Map([...first, ...order.filter((i) => !first.includes(i))].map((i, k) => [i, k]));

  return Array.from({ length: 100 }, (_, i) => {
    const k = rank.get(i) ?? 100;
    const [firstName, lastName] = k < sold ? NAMES[k % NAMES.length].split(' ') : [null, null];
    return {
      id: `square-${i}`,
      row_index: Math.floor(i / 10),
      col_index: i % 10,
      payment_status: k < paid ? 'paid' : k < sold ? 'pending' : 'available',
      claimant_first_name: firstName,
      claimant_last_name: lastName,
      referred_by: null,
    };
  });
}

const QUARTERS = ['q1', 'q2', 'q3', 'final'] as const;

/** The first `count` quarters' scores. */
export function exampleScores(count: number): GridScore[] {
  return QUARTERS.slice(0, count).map((quarter, i) => ({ quarter, winning_square_id: `square-${WINNING[i]}` }));
}
