import type { GridScore, GridSquare } from '@/components/studio/grid/model';

/**
 * Figma's made-up example fundraiser on Home (Hawks 24, Rivals 10 in Q3). Each square is its initials, or "--" for an
 * open one. A leading "~" is pending; the rest are paid.
 */
const ROWS = [
  'AA LN ~JR CJ GR RN AL -- NE AE',
  'CL -- NN GL GE LJ ME TR RC TL',
  'JA GL NJ GJ CA GL ET GG ~NT ER',
  '-- CJ LR TR JE JA CN CA TR --',
  'NG MG TG NA TT RN JA LR AR AT',
  'GN RN NW AT EE ~TE LJ NL JT GE',
  'CC AE -- RG CE NC -- RL CR LC',
  'LE ~EL TL CN AC NG EE TN JR AA',
  'AT RR AR -- EE TE RE CL LT ~NN',
  'AA LR CN CG ~JG JR NC RG -- JC',
];

export const EXAMPLE_COLORS = { team: '#9b1c2e', accent: '#f3c34a' };

export const EXAMPLE_SQUARES: GridSquare[] = ROWS.flatMap((row, rowIndex) =>
  row.split(' ').map((cell, colIndex): GridSquare => {
    const initials = cell.replace('~', '');
    const isOpen = initials === '--';
    return {
      id: `${rowIndex}-${colIndex}`,
      row_index: rowIndex,
      col_index: colIndex,
      payment_status: isOpen ? 'available' : cell.startsWith('~') ? 'pending' : 'paid',
      claimant_first_name: isOpen ? null : initials[0],
      claimant_last_name: isOpen ? null : initials[1],
      referred_by: null,
    };
  })
);

/** The viewer's own square, "ME" */
export const EXAMPLE_FIND_NAME = 'M E';

export const EXAMPLE_ROW_NUMBERS = [3, 8, 1, 6, 4, 0, 9, 2, 5, 7];
export const EXAMPLE_COL_NUMBERS = [7, 2, 9, 0, 5, 1, 8, 3, 6, 4];

/** Q3, Hawks 24 Rivals 10: row 4, column 0, "NA" */
export const EXAMPLE_SCORES: GridScore[] = [{ quarter: 'q3', winning_square_id: '4-3' }];
