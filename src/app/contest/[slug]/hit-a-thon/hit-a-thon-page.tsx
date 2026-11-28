import type { CSSProperties } from 'react';

import { OrganizerHeader } from '@/components/studio/shell/organizer-header';
import { StudioPage } from '@/components/studio/shell/studio-page';
import { getHitPlayerPledgeTotals, getHitPlayers, getPaymentOptionsForContest } from '@/features/contests/queries';
import type { Contest } from '@/features/contests/types';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

import { ShareButton } from '../share-button';

import { HitAThonFundraiser } from './hit-a-thon-fundraiser';
import { type PublicHitAThon, type PublicHitPlayer, SHARE_CARD_SLOT } from './model';

import css from '../contest.module.css';

interface HitAThonPageProps {
  /** Past the PIN check. */
  contest: Contest;
  /** The player slug in the link, if any. */
  referral: string | null;
  /** The owner's own PIN, to share. Null for everyone else. */
  sharePin: string | null;
  colors: CSSProperties;
}

/** A hit-a-thon's public page: the event, or one player's page when the link names them. */
export async function HitAThonPage({ contest, referral, sharePin, colors }: HitAThonPageProps) {
  const pitchesPerPlayer = contest.pitches_per_player ?? 0;

  // Past the PIN check, so read with the service role: the database hides these rows from anyone but the owner when
  // the contest has a PIN. Only totals per player go to the browser, never a pledge or a supporter.
  const [hitPlayers, totals, paymentOptions] = await Promise.all([
    getHitPlayers(contest.id, supabaseAdminClient),
    getHitPlayerPledgeTotals(contest.id, pitchesPerPlayer, supabaseAdminClient),
    getPaymentOptionsForContest(contest.id, supabaseAdminClient),
  ]);

  const players: PublicHitPlayer[] = hitPlayers.map((player) => ({
    ...player,
    pledged: totals[player.id]?.pledged ?? 0,
    supporters: totals[player.id]?.supporters ?? 0,
  }));
  // An unknown name in the link shows the event
  const player = (referral && players.find(({ slug }) => slug.toLowerCase() === referral.toLowerCase())) || null;

  const hitAThon: PublicHitAThon = {
    id: contest.id,
    name: contest.name,
    status: contest.status,
    hitsLocked: !!contest.hits_locked_at,
    pitchesPerPlayer,
    playerGoal: contest.player_goal === null ? null : Number(contest.player_goal),
  };

  return (
    <StudioPage
      className={css.page}
      style={colors}
      header={
        <OrganizerHeader
          contestName={contest.name}
          description={contest.description}
          logoUrl={contest.org_image_url}
          action={
            <ShareButton
              contestName={contest.name}
              contestSlug={contest.slug}
              referral={player?.slug ?? null}
              accessPin={sharePin}
              colors={colors}
              {...(player && {
                title: `Share ${player.first_name}'s page`,
                description: 'Send this link to family and friends.',
                besideId: SHARE_CARD_SLOT,
              })}
            />
          }
        />
      }
    >
      <HitAThonFundraiser
        hitAThon={hitAThon}
        players={players}
        player={player}
        paymentOptions={paymentOptions}
        colors={colors}
      />
    </StudioPage>
  );
}
