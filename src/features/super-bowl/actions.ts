'use server';

import { after } from 'next/server';

import { requireAdmin } from '@/features/admin/require-admin';
import { ContestErrors } from '@/features/contests/constants';
import { AuthError, ValidationError } from '@/features/contests/middleware/auth-middleware';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import type { ActionResponse } from '@/types/action-response';
import { logger } from '@/utils/logger';

import { applyScores, drainSeasonEmails, previewScores } from './apply-scores';
import { SuperBowlErrors } from './constants';
import { getSuperBowlGame } from './queries';
import { SUPER_BOWL_SEASON } from './season';
import type { SuperBowlApplyResult, SuperBowlGame, SuperBowlScores, SuperBowlTeam } from './types';
import { findScoreError, toGameScores } from './validate-scores';

/** Saves the two team names. The scores stay. */
export async function saveSuperBowlTeams(afcTeam: string, nfcTeam: string): Promise<ActionResponse> {
  return asAdmin('saveSuperBowlTeams', async () => {
    const afc_team = typeof afcTeam === 'string' ? afcTeam.trim() : '';
    const nfc_team = typeof nfcTeam === 'string' ? nfcTeam.trim() : '';
    if (!afc_team || !nfc_team) throw new ValidationError(SuperBowlErrors.TEAMS_FIRST);

    const { error } = await supabaseAdminClient
      .from('super_bowl_games')
      .upsert({ season: SUPER_BOWL_SEASON, afc_team, nfc_team }, { onConflict: 'season' });
    if (error) throw new Error(`Failed to save the teams: ${error.message}`);

    return null;
  });
}

/** How many contests saving these scores would change, and how many winners it would email. Saves nothing. */
export async function previewSuperBowlScores(
  scores: SuperBowlScores
): Promise<ActionResponse<{ contests: number; winners: number }>> {
  return asAdmin('previewSuperBowlScores', async () => {
    const game = await checkScores(scores);
    return previewScores({ ...game, ...toGameScores(scores) });
  });
}

/** Saves the scores and applies them to this season's contests. */
export async function saveSuperBowlScores(scores: SuperBowlScores): Promise<ActionResponse<SuperBowlApplyResult>> {
  return asAdmin('saveSuperBowlScores', async () => {
    await checkScores(scores);

    const { error } = await supabaseAdminClient
      .from('super_bowl_games')
      .update(toGameScores(scores))
      .eq('season', SUPER_BOWL_SEASON);
    if (error) throw new Error(`Failed to save the scores: ${error.message}`);

    // After the response, whatever happens below, so a saved quarter's email still goes out
    after(drainSeasonEmails);
    return applyScores();
  });
}

/** Applies the saved scores again, for contests that weren't ready before. */
export async function applySuperBowlScores(): Promise<ActionResponse<SuperBowlApplyResult>> {
  return asAdmin('applySuperBowlScores', async () => {
    after(drainSeasonEmails);
    return applyScores();
  });
}

/** Sets which team is on a contest's rows, when the names don't match. It can't be changed later. */
export async function setSuperBowlRowTeam(contestId: string, team: SuperBowlTeam): Promise<ActionResponse> {
  return asAdmin('setSuperBowlRowTeam', async () => {
    if (team !== 'afc' && team !== 'nfc') throw new Error('Invalid row team');

    const { data, error } = await supabaseAdminClient
      .from('contests')
      .update({ super_bowl_row_team: team })
      .eq('id', contestId)
      .eq('super_bowl_season', SUPER_BOWL_SEASON)
      .eq('sport_type', 'football')
      .is('deleted_at', null)
      .is('super_bowl_row_team', null)
      .select('id');
    if (error) throw new Error(`Failed to set the row team: ${error.message}`);
    if (data.length === 0) throw new ValidationError(ContestErrors.NOT_FOUND);

    return null;
  });
}

/** Sends the emails that are waiting, and retries the refused ones. */
export async function sendUnsentSuperBowlEmails(): Promise<ActionResponse> {
  return asAdmin('sendUnsentSuperBowlEmails', async () => {
    after(drainSeasonEmails);
    return null;
  });
}

async function asAdmin<T>(name: string, run: () => Promise<T>): Promise<ActionResponse<T>> {
  try {
    await requireAdmin();
    return { data: await run(), error: null };
  } catch (error) {
    if (error instanceof AuthError || error instanceof ValidationError) {
      return { data: null, error: { message: error.message } };
    }
    logger.error(name, error);
    return { data: null, error: { message: 'An unexpected error occurred' } };
  }
}

/** The saved game, if these scores can be saved on it. */
async function checkScores(scores: SuperBowlScores): Promise<SuperBowlGame> {
  const game = await getSuperBowlGame();
  if (!game) throw new ValidationError(SuperBowlErrors.TEAMS_FIRST);

  const scoreError = findScoreError(scores, game);
  if (scoreError) throw new ValidationError(scoreError);

  return game;
}
