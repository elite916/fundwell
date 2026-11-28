import Link from 'next/link';
import { notFound } from 'next/navigation';

import { organizerColors } from '@/components/studio/color';
import { DashButton } from '@/components/studio/dashboard/dash-button';
import { BackLink, DashPage, Tag } from '@/components/studio/dashboard/dash-page';
import { studioTheme } from '@/components/studio/theme';
import { ManageSquare } from '@/features/contests/components/manage-square-modal';
import {
  getContestById,
  getContestPinForOwner,
  getParticipantsForContest,
  getScoresForContest,
  getSquaresForContest,
} from '@/features/contests/queries';
import { formatPrizeAmount } from '@/features/contests/utils';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Database } from '@/libs/supabase/types';
import { cn } from '@/utils/cn';
import { getURL } from '@/utils/get-url';

import { ContestStatusButton } from './contest-status-button';
import { CopyLinkButton } from './copy-link-button';
import { DashboardGridClient } from './dashboard-grid-client';
import { EnterScoresButton } from './enter-scores-button';
import { HitAThonOverview } from './hit-a-thon-overview';
import { ManageNumbersButton } from './manage-numbers-button';
import { NextStepsCard } from './next-steps-card';
import { WinnersSection } from './winners-section';

import css from './run.module.css';

type ContestStatus = Database['public']['Enums']['contest_status'];

interface ContestDetailPageProps {
  params: Promise<{ contestId: string }>;
}

const STATUS_LABELS: Record<ContestStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  locked: 'Locked',
  in_progress: 'In progress',
  completed: 'Completed',
};

/** Figma's Status chip, per status. The rest are Open's look. */
const STATUS_TONES: Partial<Record<ContestStatus, 'now' | 'locked'>> = {
  locked: 'locked',
  in_progress: 'now',
};

// A hit-a-thon's "Lock and Send Totals" sends its emails after the response, a batch at a time
export const maxDuration = 300;

export default async function ContestDetailPage({ params }: ContestDetailPageProps) {
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

  // No grid, scores or winners
  if (contest.kind === 'hit_a_thon') {
    return (
      <HitAThonOverview
        contest={contest}
        statusLabel={STATUS_LABELS[contest.status]}
        statusTone={STATUS_TONES[contest.status] ?? 'quiet'}
      />
    );
  }

  // Fetch squares, scores, and payment options count
  const [squares, scores, paymentOptionsResult, participants, accessPin] = await Promise.all([
    getSquaresForContest(contestId),
    getScoresForContest(contestId),
    supabase.from('payment_options').select('*', { count: 'exact', head: true }).eq('contest_id', contestId),
    getParticipantsForContest(contestId),
    getContestPinForOwner(contestId),
  ]);

  const hasPaymentOptions = (paymentOptionsResult.count ?? 0) > 0;
  const hasNumbers = contest.row_numbers !== null;

  // Calculate stats
  // Add owner-only details (email, Venmo, dates) to the grid squares for the manage modal
  const participantsById = new Map(participants.map((p) => [p.id, p]));
  const squaresList: ManageSquare[] = (squares || []).map((s) => {
    const participant = participantsById.get(s.id);
    return {
      ...s,
      claimant_email: participant?.claimant_email ?? null,
      claimant_venmo: participant?.claimant_venmo ?? null,
      claimed_at: participant?.claimed_at ?? null,
      paid_at: participant?.paid_at ?? null,
    };
  });
  const claimedSquares = squaresList.filter((s) => s.payment_status !== 'available');
  const paidSquares = squaresList.filter((s) => s.payment_status === 'paid');
  const revenue = paidSquares.length * Number(contest.square_price);

  // Calculate fundraiser amount
  const totalPayoutPercent =
    contest.sport_type === 'football'
      ? (contest.payout_q1_percent ?? 0) +
        (contest.payout_q2_percent ?? 0) +
        (contest.payout_q3_percent ?? 0) +
        (contest.payout_final_percent ?? 0)
      : (contest.payout_game1_percent ?? 0) +
        (contest.payout_game2_percent ?? 0) +
        (contest.payout_game3_percent ?? 0) +
        (contest.payout_game4_percent ?? 0) +
        (contest.payout_game5_percent ?? 0) +
        (contest.payout_game6_percent ?? 0) +
        (contest.payout_game7_percent ?? 0);
  const fundraiserPercent = 100 - totalPayoutPercent;
  const totalPot = 100 * Number(contest.square_price);
  const fundraiserCurrent = revenue * (fundraiserPercent / 100);
  const fundraiserMax = totalPot * (fundraiserPercent / 100);

  const publicUrl = getURL(`/contest/${contest.slug}`);

  const stats = [
    { label: 'Total Squares', value: 100 },
    { label: 'Claimed', value: claimedSquares.length, note: `${100 - claimedSquares.length} available` },
    {
      label: 'Paid',
      value: paidSquares.length,
      note: `${claimedSquares.length - paidSquares.length} pending payment`,
    },
    { label: 'Revenue', value: formatPrizeAmount(revenue), note: `${formatPrizeAmount(totalPot)} max` },
    {
      label: 'Fundraiser',
      value: formatPrizeAmount(fundraiserCurrent),
      note: `${formatPrizeAmount(fundraiserMax)} potential`,
    },
  ];

  return (
    <DashPage>
      <div className={cn(css.run, contest.status === 'in_progress' && css.playing)}>
        {/* In the grid, so Quick Actions starts level with it */}
        <BackLink href='/dashboard' className={css.back}>
          Back to Dashboard
        </BackLink>

        {/* Header */}
        <div className={css.head}>
          <div>
            <div className={css.title}>
              <h1>{contest.name}</h1>
              <Tag tone={STATUS_TONES[contest.status] ?? 'quiet'}>{STATUS_LABELS[contest.status]}</Tag>
            </div>
            <p className={css.about}>
              {contest.row_team_name} vs {contest.col_team_name}
            </p>
            {contest.description && <p className={css.about}>{contest.description}</p>}
          </div>

          <div className={css.row}>
            <CopyLinkButton url={publicUrl} code={accessPin} contestName={contest.name} />
            <DashButton asChild look='quiet'>
              <Link href={`/dashboard/${contestId}/settings`}>Settings</Link>
            </DashButton>
          </div>
        </div>

        <div className={css.side}>
          {/* Quick Actions */}
          <section aria-labelledby='quick-actions' className={cn(css.card, css.quick)}>
            <h2 id='quick-actions' tabIndex={-1}>
              Quick Actions
            </h2>
            <p>Manage your contest</p>
            <div className={css.acts}>
              <ContestStatusButton contestId={contestId} currentStatus={contest.status} className={css.go} />

              <Link href={`/contest/${contest.slug}`} target='_blank'>
                View Public Page
              </Link>

              <Link href={`/dashboard/${contestId}/participants`}>Manage Participants</Link>

              {contest.enable_player_tracking && (
                <Link href={`/dashboard/${contestId}/team-members`}>Manage Team Members</Link>
              )}
            </div>
          </section>

          {/* Winners */}
          <WinnersSection
            contest={{
              sport_type: contest.sport_type,
              row_team_name: contest.row_team_name ?? '',
              col_team_name: contest.col_team_name ?? '',
              square_price: Number(contest.square_price),
              payout_q1_percent: contest.payout_q1_percent,
              payout_q2_percent: contest.payout_q2_percent,
              payout_q3_percent: contest.payout_q3_percent,
              payout_final_percent: contest.payout_final_percent,
              payout_game1_percent: contest.payout_game1_percent,
              payout_game2_percent: contest.payout_game2_percent,
              payout_game3_percent: contest.payout_game3_percent,
              payout_game4_percent: contest.payout_game4_percent,
              payout_game5_percent: contest.payout_game5_percent,
              payout_game6_percent: contest.payout_game6_percent,
              payout_game7_percent: contest.payout_game7_percent,
              prize_type: contest.prize_type,
              prize_q1_text: contest.prize_q1_text,
              prize_q2_text: contest.prize_q2_text,
              prize_q3_text: contest.prize_q3_text,
              prize_final_text: contest.prize_final_text,
              super_bowl_season: contest.super_bowl_season,
            }}
            scores={scores}
            squares={squaresList}
          />
        </div>

        {/* Stats */}
        <dl className={css.stats}>
          {stats.map(({ label, value, note }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <b>{value}</b>
                {note && <span>{note}</span>}
              </dd>
            </div>
          ))}
        </dl>

        {/* Next Steps */}
        <NextStepsCard
          contestId={contest.id}
          status={contest.status}
          hasPaymentOptions={hasPaymentOptions}
          hasNumbers={hasNumbers}
        />

        {/* Grid Preview */}
        {/*
          The board in the contest's own colors; the rest of the dashboard stays in Fundwell's. The theme goes on again
          here, so the square colors that follow the team ones pick them up.
        */}
        <section
          aria-labelledby='grid-preview'
          className={cn(studioTheme, css.squares)}
          style={organizerColors(contest.primary_color, contest.secondary_color)}
        >
          <div className={css.gridHead}>
            <div>
              <h2 id='grid-preview'>Grid Preview</h2>
              <p>
                <span>10×10 squares grid</span>
                <span>Click to manage squares</span>
              </p>
            </div>
            <div className={css.row}>
              <EnterScoresButton
                contest={{
                  id: contest.id,
                  sport_type: contest.sport_type,
                  row_team_name: contest.row_team_name ?? '',
                  col_team_name: contest.col_team_name ?? '',
                  row_numbers: contest.row_numbers,
                  col_numbers: contest.col_numbers,
                  status: contest.status,
                  square_price: Number(contest.square_price),
                  payout_q1_percent: contest.payout_q1_percent,
                  payout_q2_percent: contest.payout_q2_percent,
                  payout_q3_percent: contest.payout_q3_percent,
                  payout_final_percent: contest.payout_final_percent,
                  payout_game1_percent: contest.payout_game1_percent,
                  payout_game2_percent: contest.payout_game2_percent,
                  payout_game3_percent: contest.payout_game3_percent,
                  payout_game4_percent: contest.payout_game4_percent,
                  payout_game5_percent: contest.payout_game5_percent,
                  payout_game6_percent: contest.payout_game6_percent,
                  payout_game7_percent: contest.payout_game7_percent,
                  prize_type: contest.prize_type,
                  prize_q1_text: contest.prize_q1_text,
                  prize_q2_text: contest.prize_q2_text,
                  prize_q3_text: contest.prize_q3_text,
                  prize_final_text: contest.prize_final_text,
                }}
                scores={scores}
                squares={squaresList}
              />
              <ManageNumbersButton
                contest={{
                  id: contest.id,
                  status: contest.status,
                  row_numbers: contest.row_numbers,
                  col_numbers: contest.col_numbers,
                  numbers_auto_generated: contest.numbers_auto_generated,
                  row_team_name: contest.row_team_name,
                  col_team_name: contest.col_team_name,
                }}
              />
            </div>
          </div>

          <DashboardGridClient
            squares={squaresList}
            rowTeamName={contest.row_team_name ?? ''}
            colTeamName={contest.col_team_name ?? ''}
            contestId={contestId}
            contestStatus={contest.status}
            squarePrice={Number(contest.square_price)}
            rowNumbers={contest.row_numbers}
            colNumbers={contest.col_numbers}
            scores={scores}
          />
        </section>
      </div>
    </DashPage>
  );
}
