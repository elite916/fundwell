import type { GameQuarter, Score } from '../types';

interface TypedEntry {
  quarter: GameQuarter;
  homeScore: string;
  awayScore: string;
}

/**
 * Splits what's in the score fields into the complete quarters that differ from the saved scores, and whether
 * any other quarter was left half filled or had its saved score cleared.
 */
export function changedScores(
  entries: readonly TypedEntry[],
  savedScores: readonly Pick<Score, 'quarter' | 'home_score' | 'away_score'>[]
): { changed: { quarter: GameQuarter; homeScore: number; awayScore: number }[]; hasIncomplete: boolean } {
  const changed = [];
  let hasIncomplete = false;

  for (const { quarter, homeScore, awayScore } of entries) {
    const saved = savedScores.find((s) => s.quarter === quarter);

    if (homeScore === '' || awayScore === '') {
      if (homeScore !== awayScore || saved) hasIncomplete = true;
      continue;
    }

    const entry = { quarter, homeScore: parseInt(homeScore, 10), awayScore: parseInt(awayScore, 10) };
    if (entry.homeScore !== saved?.home_score || entry.awayScore !== saved.away_score) changed.push(entry);
  }

  return { changed, hasIncomplete };
}
