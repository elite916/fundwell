import type { Tables } from '@/libs/supabase/types';

import type { SUPER_BOWL_QUARTERS } from './constants';

export type SuperBowlGame = Tables<'super_bowl_games'>;
export type SuperBowlQuarter = (typeof SUPER_BOWL_QUARTERS)[number];
export type SuperBowlTeam = 'afc' | 'nfc';

/** Each team's score at the end of each quarter. Null when it isn't in yet. */
export type SuperBowlScores = Record<SuperBowlQuarter, Record<SuperBowlTeam, number | null>>;

/** Why a contest can't be scored yet. */
export type SuperBowlProblem = 'not_started' | 'no_numbers' | 'names_dont_match';

export interface SuperBowlApplyResult {
  contestsUpdated: number;
  skipped: { contestId: string; reason: SuperBowlProblem }[];
  failed: { contestId: string; name: string }[];
}
