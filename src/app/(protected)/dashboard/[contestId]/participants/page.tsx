import { notFound } from 'next/navigation';

import { BackLink, DashPage, PageHead, Panel } from '@/components/studio/dashboard/dash-page';
import { getContestById, getParticipantsForContest } from '@/features/contests/queries';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { ParticipantsTableClient } from './participants-table-client';

import css from '../table.module.css';

interface ParticipantsPageProps {
  params: Promise<{ contestId: string }>;
}

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
