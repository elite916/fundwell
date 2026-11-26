import { notFound } from 'next/navigation';

import { BackLink, DashPage, PageHead, Panel } from '@/components/studio/dashboard/dash-page';
import {
  getContestById,
  getHitPlayersWithHits,
  getParticipantsForContest,
  getPledgesForOwner,
} from '@/features/contests/queries';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { ParticipantsTableClient } from './participants-table-client';
import { PledgesTableClient } from './pledges-table-client';

import css from '../table.module.css';

interface ParticipantsPageProps {
  params: Promise<{ contestId: string }>;
}

// A hit-a-thon's "Email Unpaid Supporters" sends its emails after the response, a batch at a time
export const maxDuration = 300;

export default async function ParticipantsPage({ params }: ParticipantsPageProps) {
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

  // A hit-a-thon's participants are its pledges
  if (contest.kind === 'hit_a_thon') {
    const [players, pledges] = await Promise.all([getHitPlayersWithHits(contestId), getPledgesForOwner(contestId)]);

    return (
      <DashPage>
        <BackLink href={`/dashboard/${contestId}`}>Back to Contest</BackLink>

        <PageHead title='Pledges' sub={[contest.name]} />

        <Panel aria-labelledby='pledges'>
          <h2 id='pledges'>Pledges</h2>

          <PledgesTableClient
            contestId={contestId}
            pitches={contest.pitches_per_player ?? 0}
            players={players}
            pledges={pledges}
            isLocked={!!contest.hits_locked_at}
          />
        </Panel>
      </DashPage>
    );
  }

  // Fetch participants (claimed squares)
  const participants = await getParticipantsForContest(contestId);

  return (
    <DashPage>
      <BackLink href={`/dashboard/${contestId}`}>Back to Contest</BackLink>

      <PageHead
        title='Manage Participants'
        sub={[contest.name, `${participants.length} participant${participants.length !== 1 ? 's' : ''}`]}
      />

      <Panel aria-labelledby='participants'>
        <h2 id='participants'>Participants</h2>
        <p className={css.about}>View and manage all participants who have claimed squares</p>

        <ParticipantsTableClient
          participants={participants}
          contestId={contestId}
          contestStatus={contest.status}
          contestName={contest.name}
          squarePrice={Number(contest.square_price)}
        />
      </Panel>
    </DashPage>
  );
}
