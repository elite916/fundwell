import { SUPER_BOWL_QUARTERS, SuperBowlErrors } from './constants';
import type { SuperBowlGame, SuperBowlScores } from './types';

// The most one team has scored in an NFL game is 73
const MAX_SCORE = 99;

const isScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_SCORE;

const isBlank = (value: unknown) => value === null || value === undefined;

/** The error to show, or null when the scores can be saved. */
export function findScoreError(scores: SuperBowlScores, game: SuperBowlGame): string | null {
  let last = { afc: 0, nfc: 0 };

  for (const quarter of SUPER_BOWL_QUARTERS) {
    const afc = scores?.[quarter]?.afc;
    const nfc = scores?.[quarter]?.nfc;

    if (isBlank(afc) && isBlank(nfc)) {
      if (game[`${quarter}_afc`] !== null) return SuperBowlErrors.BOTH_SCORES;
      continue;
    }
    if (!isScore(afc) || !isScore(nfc)) return SuperBowlErrors.BOTH_SCORES;
    if (afc < last.afc || nfc < last.nfc) return SuperBowlErrors.SCORE_DOWN;
    if (quarter === 'final' && afc === nfc) return SuperBowlErrors.TIED_FINAL;

    last = { afc, nfc };
  }

  return null;
}

/** The scores as the game row's columns. */
export function toGameScores(scores: SuperBowlScores) {
  return {
    q1_afc: scores.q1?.afc ?? null,
    q1_nfc: scores.q1?.nfc ?? null,
    q2_afc: scores.q2?.afc ?? null,
    q2_nfc: scores.q2?.nfc ?? null,
    q3_afc: scores.q3?.afc ?? null,
    q3_nfc: scores.q3?.nfc ?? null,
    final_afc: scores.final?.afc ?? null,
    final_nfc: scores.final?.nfc ?? null,
  };
}
