export const SUPER_BOWL_QUARTERS = ['q1', 'q2', 'q3', 'final'] as const;

export const SuperBowlErrors = {
  BOTH_SCORES: 'Enter both scores for a quarter.',
  TIED_FINAL: "The final can't be a tie.",
  SCORE_DOWN: "Scores can't go down from one quarter to the next.",
  TEAMS_FIRST: 'Enter both team names first.',
} as const;
