import { requireAdmin } from '@/features/admin/require-admin';
import { ContestStatus, hasGameStarted } from '@/features/contests/constants';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

import { SUPER_BOWL_QUARTERS } from './constants';
import { SUPER_BOWL_SEASON } from './season';
import { matchRowTeam } from './team-match';
import type { SuperBowlGame, SuperBowlProblem, SuperBowlQuarter, SuperBowlTeam } from './types';

import 'server-only';

export async function getSuperBowlGame(): Promise<SuperBowlGame | null> {
  const { data, error } = await supabaseAdminClient
    .from('super_bowl_games')
    .select('*')
    .eq('season', SUPER_BOWL_SEASON)
    .maybeSingle();
  if (error) throw new Error(`Failed to load the game: ${error.message}`);
  return data;
}

/** This season's contests, oldest first. */
export async function getSeasonContests() {
  const { data, error } = await supabaseAdminClient
    .from('contests')
    .select(
      'id, name, slug, status, row_team_name, col_team_name, row_numbers, col_numbers, super_bowl_row_team, scores(quarter, source)'
    )
    .eq('super_bowl_season', SUPER_BOWL_SEASON)
    .eq('sport_type', 'football')
    .is('deleted_at', null)
    .order('created_at');
  if (error) throw new Error(`Failed to load the contests: ${error.message}`);
  return data;
}

export type SeasonContest = Awaited<ReturnType<typeof getSeasonContests>>[number];

/** The team on the rows: the one stored at the first scoring, or else by name. */
export function getRowTeam(contest: SeasonContest, game: SuperBowlGame): SuperBowlTeam | null {
  return (
    (contest.super_bowl_row_team as SuperBowlTeam | null) ??
    matchRowTeam({ afc: game.afc_team, nfc: game.nfc_team }, contest.row_team_name, contest.col_team_name)
  );
}

export function getProblem(contest: SeasonContest, game: SuperBowlGame | null): SuperBowlProblem | null {
  if (!hasGameStarted(contest.status ?? ContestStatus.DRAFT)) return 'not_started';
  if (!contest.row_numbers || !contest.col_numbers) return 'no_numbers';
  if (game && !getRowTeam(contest, game)) return 'names_dont_match';
  return null;
}

async function countEmails(statuses: string[]): Promise<number> {
  const { count, error } = await supabaseAdminClient
    .from('email_logs')
    .select('id, contests!inner(id)', { count: 'exact', head: true })
    .eq('contests.super_bowl_season', SUPER_BOWL_SEASON)
    .eq('contests.sport_type', 'football')
    .is('contests.deleted_at', null)
    .not('dedupe_key', 'is', null)
    .in('status', statuses);
  if (error || count === null) throw new Error(`Failed to count the emails: ${error?.message}`);
  return count;
}

/** Everything on the admin page. Throws unless the current user is an admin. */
export async function getSuperBowlPage() {
  await requireAdmin();

  const [game, contests, sent, waiting, refused, notConfirmed] = await Promise.all([
    getSuperBowlGame(),
    getSeasonContests(),
    countEmails(['sent']),
    countEmails(['queued', 'sending']),
    countEmails(['failed']),
    countEmails(['unconfirmed']),
  ]);

  return {
    season: SUPER_BOWL_SEASON,
    game,
    contests: contests.map((contest) => ({
      id: contest.id,
      name: contest.name,
      slug: contest.slug,
      status: contest.status,
      problem: getProblem(contest, game),
      // A quarter without a score has no entry
      sources: Object.fromEntries(
        contest.scores
          .filter(({ quarter }) => (SUPER_BOWL_QUARTERS as readonly string[]).includes(quarter))
          .map(({ quarter, source }) => [quarter, source])
      ) as Partial<Record<SuperBowlQuarter, 'fundwell' | 'organizer' | null>>,
    })),
    emails: { sent, waiting, refused, notConfirmed },
  };
}
