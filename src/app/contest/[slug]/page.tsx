import { MarketingHeader } from '@/components/layout/marketing-header';
import { organizerColors } from '@/components/studio/color';
import { OrganizerHeader } from '@/components/studio/shell/organizer-header';
import { StudioPage } from '@/components/studio/shell/studio-page';
import { TextLink } from '@/components/studio/text-link';
import { hasContestAccess } from '@/features/contests/access';
import { requireAuth } from '@/features/contests/middleware/auth-middleware';
import {
  getContestPin,
  getPaymentOptionsForContest,
  getScoresForContest,
  getSquaresForContest,
} from '@/features/contests/queries';
import { getPublicContestBySlug } from '@/features/contests/queries/get-contest-safe';

import { SquaresFundraiser } from './squares/squares-fundraiser';
import { ContestMessage } from './contest-message';
import { OrganizerPrint } from './organizer-print';
import { PinGate } from './pin-gate';
import { ShareButton } from './share-button';

import css from './contest.module.css';

interface ContestPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}

export default async function ContestPage({ params, searchParams }: ContestPageProps) {
  const { slug } = await params;

  const contest = await getPublicContestBySlug(slug);

  if (!contest) {
    return (
      <ContestMessage
        header={<MarketingHeader />}
        title='Contest Not Found'
        action={<TextLink href='/'>Back to Home</TextLink>}
      >
        The contest you&apos;re looking for doesn&apos;t exist or may have been removed.
      </ContestMessage>
    );
  }

  const colors = organizerColors(contest.primary_color ?? '#F97316', contest.secondary_color ?? '#D97706');

  // Fetch access PIN separately (not included in PublicContest for security)
  const accessPin = await getContestPin(contest.slug);

  // Check if user has access (either no PIN required or valid cookie)
  if (!(await hasContestAccess(contest.slug, accessPin))) {
    return (
      <StudioPage className={css.page} style={colors} header={<OrganizerHeader contestName={contest.name} />}>
        <PinGate contestSlug={contest.slug} />
      </StudioPage>
    );
  }

  // Check if current user is the contest owner
  let isOwner = false;
  try {
    const { user } = await requireAuth();
    isOwner = user.id === contest.owner_id;
  } catch {
    // User is not authenticated
    isOwner = false;
  }

  const [squares, paymentOptions, scores, { ref }] = await Promise.all([
    getSquaresForContest(contest.id),
    getPaymentOptionsForContest(contest.id),
    getScoresForContest(contest.id),
    searchParams,
  ]);
  const referral = (Array.isArray(ref) ? ref[0] : ref) || null;

  // Only what the page uses goes to the browser
  const contestForClient = {
    id: contest.id,
    status: contest.status,
    sport_type: contest.sport_type,
    row_team_name: contest.row_team_name,
    col_team_name: contest.col_team_name,
    square_price: contest.square_price,
    max_squares_per_person: contest.max_squares_per_person,
    row_numbers: contest.row_numbers,
    col_numbers: contest.col_numbers,
    // Payout percentages for winner display
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
    // Prize settings
    prize_type: contest.prize_type,
    prize_q1_text: contest.prize_q1_text,
    prize_q2_text: contest.prize_q2_text,
    prize_q3_text: contest.prize_q3_text,
    prize_final_text: contest.prize_final_text,
    // Player tracking
    enable_player_tracking: contest.enable_player_tracking,
    players: contest.players,
  };

  return (
    <StudioPage
      className={css.page}
      style={colors}
      header={
        <OrganizerHeader
          contestName={contest.name}
          logoUrl={contest.org_image_url}
          action={
            <ShareButton
              contestName={contest.name}
              contestSlug={contest.slug}
              referral={referral}
              // The owner's own PIN, to share. Nobody else gets it.
              accessPin={isOwner ? accessPin : null}
              colors={colors}
            />
          }
        />
      }
    >
      <SquaresFundraiser
        contest={contestForClient}
        squares={squares}
        scores={scores}
        paymentOptions={paymentOptions}
        referral={referral}
        colors={colors}
        organizer={
          <OrganizerPrint
            contestName={contest.name}
            imageUrl={contest.hero_image_url}
            imagePosition={contest.hero_image_position}
            logoUrl={contest.org_image_url}
            description={contest.description}
          />
        }
      />
    </StudioPage>
  );
}

// Generate metadata for the page
export async function generateMetadata({ params }: ContestPageProps) {
  const { slug } = await params;
  const contest = await getPublicContestBySlug(slug);

  if (!contest) {
    return {
      title: 'Contest Not Found | Fundwell',
    };
  }

  return {
    title: `${contest.name} | Fundwell`,
    description: contest.description || `Join ${contest.name} - ${contest.row_team_name} vs ${contest.col_team_name}`,
  };
}
