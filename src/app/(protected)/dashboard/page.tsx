import Link from 'next/link';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { DashEmpty, DashPage } from '@/components/studio/dashboard/dash-page';
import { ContestCard } from '@/features/contests/components/contest-card';
import { ContestStatus } from '@/features/contests/constants/status';
import { listContestsForOwner } from '@/features/contests/queries';
import { UpgradeBanner } from '@/features/subscriptions/components/upgrade-banner';
import { hasActiveSubscription } from '@/features/subscriptions/has-active-subscription';
import { hasOverdueSubscription } from '@/features/subscriptions/has-overdue-subscription';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import css from './contest-list.module.css';

function EmptyState() {
  return (
    <DashEmpty
      title="You haven't created any contests yet."
      text='Create your first fundraiser to get started!'
    >
      <DashButton asChild look='quiet'>
        <Link href='/dashboard/new'>Create Your First Contest</Link>
      </DashButton>
    </DashEmpty>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check if user has active subscription
  const [userHasSubscription, isOverdue] = await Promise.all([
    hasActiveSubscription(user.id),
    hasOverdueSubscription(user.id),
  ]);

  // Fetch contests with claimed squares count
  const contests = await listContestsForOwner(user.id);

  // Calculate claimed counts for each contest
  const contestsWithCounts = contests.map((contest) => {
    const claimedCount = contest.squares?.filter((sq) => sq.payment_status !== 'available').length ?? 0;
    return { ...contest, claimedCount };
  });

  // Count active contests for upgrade banner
  const activeContestCount = contests.filter((c) =>
    (
      [ContestStatus.DRAFT, ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.IN_PROGRESS] as readonly string[]
    ).includes(c.status)
  ).length;

  return (
    <DashPage>
      {/* Show upgrade banner only for free users, or the payment banner if their Pro is unpaid */}
      {!userHasSubscription && <UpgradeBanner activeContestCount={activeContestCount} isOverdue={isOverdue} />}

      <div className={css.head}>
        <h1>My Contests</h1>
        <DashButton asChild>
          <Link href='/dashboard/new'>Create Contest</Link>
        </DashButton>
      </div>

      {contestsWithCounts.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className={css.list}>
          {contestsWithCounts.map((contest) => (
            <li key={contest.id}>
              <ContestCard contest={contest} claimedCount={contest.claimedCount} />
            </li>
          ))}
        </ul>
      )}
    </DashPage>
  );
}
