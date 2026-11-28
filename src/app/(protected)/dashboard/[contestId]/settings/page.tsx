import { notFound, redirect } from 'next/navigation';

import { BackLink, DashPage, PageHead } from '@/components/studio/dashboard/dash-page';
import { ContestStatus } from '@/features/contests/constants';
import {
  getContestById,
  getContestPinForOwner,
  getHitPlayers,
  getPaymentOptionsForContest,
} from '@/features/contests/queries';
import { getPlayerSalesCounts } from '@/features/contests/queries/get-player-sales-counts';
import { isSeasonOpen } from '@/features/super-bowl/queries';
import { SUPER_BOWL_SEASON } from '@/features/super-bowl/season';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { AccessControlSection } from './access-control-section';
import { BasicInfoSection } from './basic-info-section';
import { BrandingSection } from './branding-section';
import { ContestStatusSection } from './contest-status-section';
import { DangerZoneSection } from './danger-zone-section';
import { HitPlayersSection } from './hit-players-section';
import { PaymentOptionsSection } from './payment-options-section';
import { PitchesGoalSection } from './pitches-goal-section';
import { PlayerTrackingSection } from './player-tracking-section';
import { PricingPayoutsSection } from './pricing-payouts-section';

import css from '@/components/studio/setup/setup.module.css';

interface SettingsPageProps {
  params: Promise<{ contestId: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { contestId } = await params;
  const supabase = await createSupabaseServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch contest
  const contest = await getContestById(contestId);

  // Check if contest exists and is not deleted
  if (!contest || contest.deleted_at) {
    notFound();
  }

  // Verify user owns the contest
  if (contest.owner_id !== user.id) {
    redirect('/dashboard');
  }

  // Fetch payment options
  const paymentOptions = await getPaymentOptionsForContest(contestId);

  const isHitAThon = contest.kind === 'hit_a_thon';

  // Fetch player sales counts (squares), or the hit-a-thon's players
  const playerSalesCounts = isHitAThon ? {} : await getPlayerSalesCounts(contestId);
  const hitPlayers = isHitAThon ? await getHitPlayers(contestId) : [];

  // Access PIN (owner-only table)
  const accessPin = await getContestPinForOwner(contestId);

  // Whether the contest can still become a Super Bowl contest
  const canJoinSuperBowl = contest.status !== ContestStatus.COMPLETED && (await isSeasonOpen());

  // The sections below, in order.
  const sections = [
    ['basic-information', 'Basic Information'],
    ['contest-status', 'Contest Status'],
    isHitAThon ? ['pitches-goal', 'Pitches and goal'] : ['pricing-payouts', 'Pricing & Payouts'],
    ['payment-options', 'Payment Options'],
    isHitAThon ? ['players', 'Players'] : ['player-tracking', 'Player Tracking'],
    ['access-control', 'Access Control'],
    ['branding', 'Branding'],
    ['danger-zone', 'Danger Zone'],
  ];

  return (
    <DashPage className={`${css.scale} ${css.settingsPage}`}>
      <BackLink href={`/dashboard/${contestId}`}>Back to Contest</BackLink>
      <PageHead title='Contest Settings' sub={[contest.name]} />

      <div className={css.settings}>
        <nav aria-label='Contest Settings sections' className={css.jump}>
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>

        {/* Settings Sections */}
        <div>
          <BasicInfoSection contest={contest} season={SUPER_BOWL_SEASON} canJoinSuperBowl={canJoinSuperBowl} />
          <ContestStatusSection contest={contest} />
          {isHitAThon ? <PitchesGoalSection contest={contest} /> : <PricingPayoutsSection contest={contest} />}
          <PaymentOptionsSection contest={contest} paymentOptions={paymentOptions} />
          {isHitAThon ? (
            <HitPlayersSection contest={contest} players={hitPlayers} />
          ) : (
            <PlayerTrackingSection contest={contest} squaresPerPlayer={playerSalesCounts} />
          )}
          <AccessControlSection contest={contest} accessPin={accessPin} />
          <BrandingSection contest={contest} />
          <DangerZoneSection contest={contest} />
        </div>
      </div>
    </DashPage>
  );
}
