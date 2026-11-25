import { notFound, redirect } from 'next/navigation';

import { BackLink, DashPage, PageHead } from '@/components/studio/dashboard/dash-page';
import { getContestById, getContestPinForOwner, getPaymentOptionsForContest } from '@/features/contests/queries';
import { getPlayerSalesCounts } from '@/features/contests/queries/get-player-sales-counts';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { AccessControlSection } from './access-control-section';
import { BasicInfoSection } from './basic-info-section';
import { BrandingSection } from './branding-section';
import { ContestStatusSection } from './contest-status-section';
import { DangerZoneSection } from './danger-zone-section';
import { PaymentOptionsSection } from './payment-options-section';
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

  // Fetch player sales counts
  const playerSalesCounts = await getPlayerSalesCounts(contestId);

  // Access PIN (owner-only table)
  const accessPin = await getContestPinForOwner(contestId);

  // The sections below, in order.
  const sections = [
    ['basic-information', 'Basic Information'],
    ['contest-status', 'Contest Status'],
    ['pricing-payouts', 'Pricing & Payouts'],
    ['payment-options', 'Payment Options'],
    ['player-tracking', 'Player Tracking'],
    ['access-control', 'Access Control'],
    ['branding', 'Branding'],
    ['danger-zone', 'Danger Zone'],
  ];

  return (
    <DashPage className={css.scale}>
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
          <BasicInfoSection contest={contest} />
          <ContestStatusSection contest={contest} />
          <PricingPayoutsSection contest={contest} />
          <PaymentOptionsSection contest={contest} paymentOptions={paymentOptions} />
          <PlayerTrackingSection contest={contest} squaresPerPlayer={playerSalesCounts} />
          <AccessControlSection contest={contest} accessPin={accessPin} />
          <BrandingSection contest={contest} />
          <DangerZoneSection contest={contest} />
        </div>
      </div>
    </DashPage>
  );
}
