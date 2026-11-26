import { notFound, redirect } from 'next/navigation';

import { BackLink, DashPage, PageHead, Panel } from '@/components/studio/dashboard/dash-page';
import {
  getContestById,
  getHitPlayerPledgeTotals,
  getHitPlayers,
  getPlayerSalesCounts,
} from '@/features/contests/queries';
import { Player } from '@/features/contests/types/player';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { HitPlayersTableClient } from './hit-players-table-client';
import { TeamMembersTableClient } from './team-members-table-client';

import css from '../table.module.css';

interface TeamMembersPageProps {
  params: Promise<{ contestId: string }>;
}

export default async function TeamMembersPage({ params }: TeamMembersPageProps) {
  const { contestId } = await params;
  const supabase = await createSupabaseServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch contest (returns null unless the user owns it)
  const contest = await getContestById(contestId);

  if (!contest) {
    notFound();
  }

  // A hit-a-thon always has players
  if (contest.kind === 'hit_a_thon') {
    const [players, totals] = await Promise.all([
      getHitPlayers(contestId),
      getHitPlayerPledgeTotals(contestId, contest.pitches_per_player ?? 0),
    ]);

    return (
      <DashPage>
        <BackLink href={`/dashboard/${contestId}`}>Back to Contest</BackLink>

        <PageHead title='Manage Players' sub={[contest.name]} />

        <Panel aria-labelledby='players'>
          <h2 id='players'>Players</h2>
          <p className={css.about}>View players and copy their links.</p>

          <HitPlayersTableClient players={players} totals={totals} contestSlug={contest.slug} />
        </Panel>
      </DashPage>
    );
  }

  // Check if player tracking is enabled
  if (!contest.enable_player_tracking) {
    redirect(`/dashboard/${contestId}`);
  }

  // Parse players from JSONB
  const players = (contest.players as unknown as Player[]) || [];

  // Fetch sales counts
  const salesCounts = await getPlayerSalesCounts(contestId);

  return (
    <DashPage>
      <BackLink href={`/dashboard/${contestId}`}>Back to Contest</BackLink>

      <PageHead
        title='Manage Team Members'
        sub={[contest.name, `${players.length} member${players.length !== 1 ? 's' : ''}`]}
      />

      <Panel aria-labelledby='team-members'>
        <h2 id='team-members'>Team Members</h2>
        <p className={css.about}>View and manage team members who sell squares</p>

        <TeamMembersTableClient
          players={players}
          salesCounts={salesCounts}
          contestId={contestId}
          contestName={contest.name}
          contestSlug={contest.slug}
        />
      </Panel>
    </DashPage>
  );
}
