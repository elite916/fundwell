'use client';

import { type CSSProperties, useState } from 'react';
import Image from 'next/image';

import { Button } from '@/components/studio/button';
import { underSheet } from '@/components/studio/theme';
import { Display, Mid, textStyle } from '@/components/studio/type';
import type { PaymentOption } from '@/features/contests/types';
import { formatPrizeAmount } from '@/features/contests/utils';
import { cn } from '@/utils/cn';

import { charactersToFit } from '../squares/status';

import arrowRight from './arrow-right.svg';
import {
  isTakingPledges,
  percentOf,
  playerTitle,
  pledgedText,
  type PublicHitAThon,
  type PublicHitPlayer,
  SHARE_CARD_SLOT,
  statusLine,
  supportersText,
} from './model';
import { PledgeSheet } from './pledge-sheet';

import css from './hit-a-thon.module.css';

/** Wide enough for the pledge form to sit beside the player instead of in a sheet. Same as the page's two columns. */
const BESIDE_THE_PLAYER = '(min-width: 1000px)';

interface HitAThonFundraiserProps {
  hitAThon: PublicHitAThon;
  /** By number, then first name. */
  players: PublicHitPlayer[];
  /** The player the link names: their page instead of the event's. */
  player: PublicHitPlayer | null;
  paymentOptions: PaymentOption[];
  colors: CSSProperties;
}

/** Figma's Pledge totals: the amount in the team color, the supporters beside it (under it on phones). */
function PledgeTotals({ pledged, supporters }: { pledged: number; supporters: number }) {
  return (
    <p className={css.totals}>
      <span className={css.pledged}>{pledgedText(pledged)}</span>
      <span className={css.supporters}>{supportersText(supporters)}</span>
    </p>
  );
}

/** Figma's Goal progress. The words under the bar say the same, so screen readers skip the bar. */
function GoalProgress({ pledged, goal, children }: { pledged: number; goal: number; children: string }) {
  return (
    <div className={css.goal}>
      <div aria-hidden='true' className={css.bar}>
        <span style={{ width: `${percentOf(pledged, goal)}%` }} />
      </div>
      <p>{children}</p>
    </div>
  );
}

/** Everything on a hit-a-thon's page: the team's total and its players, or one player's page. */
export function HitAThonFundraiser({ hitAThon, players, player, paymentOptions, colors }: HitAThonFundraiserProps) {
  const [chosen, setChosen] = useState<PublicHitPlayer | null>(null);
  // Card beside the player on a player's page on wide screens, a sheet otherwise: decided when Pledge is pressed
  const [isBeside, setIsBeside] = useState(false);
  const isOpen = isTakingPledges(hitAThon);
  const status = statusLine(hitAThon);

  const pledged = players.reduce((sum, { pledged }) => sum + pledged, 0);
  const supporters = players.reduce((sum, { supporters }) => sum + supporters, 0);
  const teamGoal = hitAThon.playerGoal === null ? null : hitAThon.playerGoal * players.length;

  const choose = (next: PublicHitPlayer) => {
    setIsBeside(player !== null && window.matchMedia(BESIDE_THE_PLAYER).matches);
    setChosen(next);
  };

  const statusBox = status && <p className={css.status}>{status}</p>;

  const pledgeSheet = chosen && (
    <PledgeSheet
      key={chosen.id}
      contestId={hitAThon.id}
      player={chosen}
      pitchesPerPlayer={hitAThon.pitchesPerPlayer}
      paymentOptions={paymentOptions}
      beside={isBeside}
      colors={colors}
      onClose={() => setChosen(null)}
    />
  );

  if (player) {
    const headline = playerTitle(player);
    return (
      <div className={css.main}>
        <section className={css.player}>
          <p aria-hidden='true' className={cn(css.card, underSheet)}>
            {player.number ? <span className={css.cardNumber}>{player.number}</span> : null}
            <span className={css.cardName}>{player.first_name}</span>
          </p>
          <div className={cn(css.details, underSheet)}>
            <div className={css.lead}>
              <Display className={css.headline} style={{ '--fit': charactersToFit([headline]) } as CSSProperties}>
                {headline}
              </Display>
            </div>
            <PledgeTotals pledged={player.pledged} supporters={player.supporters} />
            {hitAThon.playerGoal !== null && (
              <GoalProgress pledged={player.pledged} goal={hitAThon.playerGoal}>
                {`${formatPrizeAmount(player.pledged)} of ${formatPrizeAmount(hitAThon.playerGoal)} goal`}
              </GoalProgress>
            )}
            {isOpen && (
              <Button look='team' className={css.pledge} aria-haspopup='dialog' onClick={() => choose(player)}>
                Pledge
              </Button>
            )}
            {statusBox}
          </div>
        </section>
        <div className={css.right}>
          <div id={SHARE_CARD_SLOT} className={css.slot} />
          {isBeside && pledgeSheet}
        </div>
        {!isBeside && pledgeSheet}
      </div>
    );
  }

  return (
    <div className={css.main}>
      <div className={cn(css.summary, underSheet)}>
        <PledgeTotals pledged={pledged} supporters={supporters} />
        {teamGoal !== null && teamGoal > 0 && (
          <GoalProgress pledged={pledged} goal={teamGoal}>
            {`${formatPrizeAmount(pledged)} of ${formatPrizeAmount(teamGoal)}`}
          </GoalProgress>
        )}
        {statusBox}
      </div>
      <section className={css.players}>
        {isOpen && (
          <h2>
            <Mid as='span'>Pick a player to pledge.</Mid>
          </h2>
        )}
        <ul className={css.list}>
          {players.map((each) => {
            const amount = pledgedText(each.pledged);
            const content = (
              <>
                {each.number ? <span className={css.number}>{each.number}</span> : null}
                <span className={css.text}>
                  <span className={cn(textStyle.displayXs, css.name)}>{playerTitle(each)}</span>
                  <span className={css.amount}>{amount}</span>
                </span>
                {isOpen && <Image src={arrowRight} alt='' width={24} height={24} className={css.arrow} />}
              </>
            );
            return (
              <li key={each.id}>
                {isOpen ? (
                  <button
                    type='button'
                    className={css.row}
                    aria-haspopup='dialog'
                    aria-label={`Pledge for ${each.first_name}, ${each.number ? `#${each.number}, ` : ''}${amount}`}
                    onClick={() => choose(each)}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={css.row}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      {pledgeSheet}
    </div>
  );
}
