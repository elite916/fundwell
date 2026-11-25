/** Camera and board placement: degrees, distance, board turn, and where it sits as a fraction of the canvas. */
export interface SceneFrame {
  az: number;
  el: number;
  d: number;
  spin: number;
  x: number;
  y: number;
}

/** A fixed board, instead of the home page's story. */
export interface SceneBoard {
  /** Squares raised as claimed, 0 to 99, row by row. */
  claimed: readonly number[];
  /** Row and column of the lime square, or null for none. */
  winner: readonly [number, number] | null;
  /** One loose square with the lime one on it, and no board. */
  solo?: boolean;
  frame: SceneFrame;
  /** For tall canvases. Defaults to `frame`. */
  phoneFrame?: SceneFrame;
}

/** The home page's story, as values of `progress`. In between, the board is on its way from one to the next. */
export const MOMENTS = { squares: 0, diamond: 1, empty: 2, claimed: 2.6, winner: 3 } as const;

/** The last screen of the home page. */
export const CLOSING_BOARD: SceneBoard = {
  claimed: [],
  winner: [0, 0],
  solo: true,
  frame: { az: 0, el: 27, d: 10.6, spin: -33, x: 0.24, y: 0.17 },
  phoneFrame: { az: 0, el: 30, d: 19, spin: -33, x: 0.12, y: 0.14 },
};
