'use client';

import { type CSSProperties, type ReactNode, useState } from 'react';

import { Button } from '@/components/studio/button';
import { StatusText } from '@/components/studio/status-text';
import { underSheet } from '@/components/studio/theme';
import { Display, Mid } from '@/components/studio/type';
import type { PaymentOption } from '@/features/contests/types';
import { formatPrizeAmount } from '@/features/contests/utils';
import { cn } from '@/utils/cn';

import { charactersToFit } from '../squares/status';

import {
  isTakingPledges,
  percentOf,
  playerTitle,
  pledgedLine,
  type PublicHitAThon,
  type PublicHitPlayer,
  statusLine,
} from './model';
import { PledgeSheet } from './pledge-sheet';

import css from './hit-a-thon.module.css';

interface HitAThonFundraiserProps {
  hitAThon: PublicHitAThon;
  /** By number, then first name. */
  players: PublicHitPlayer[];
  /** The player the link names: their page instead of the event's. */
  player: PublicHitPlayer | null;
  paymentOptions: PaymentOption[];
  colors: CSSProperties;
  /** The organizer's image and words. */
  organizer: ReactNode;
}

/** The goal as a bar. The words beside it say the same, so screen readers skip it. */
function GoalBar({ pledged, goal }: { pledged: number; goal: number }) {
  return (
    <div aria-hidden='true' className={css.bar}>
      <span style={{ width: `${percentOf(pledged, goal)}%` }} />
    </div>
  );
}

/** Everything on a hit-a-thon's page: the team's total and its players, or one player's page. */
export function HitAThonFundraiser({
  hitAThon,
  players,
  player,
  paymentOptions,
  colors,
  organizer,
}: HitAThonFundraiserProps) {
  const [chosen, setChosen] = useState<PublicHitPlayer | null>(null);
  const isOpen = isTakingPledges(hitAThon);
  const status = statusLine(hitAThon);

  const pledged = players.reduce((sum, { pledged }) => sum + pledged, 0);
  const supporters = players.reduce((sum, { supporters }) => sum + supporters, 0);
  const teamGoal = hitAThon.playerGoal === null ? null : hitAThon.playerGoal * players.length;
  const headline = player ? playerTitle(player) : hitAThon.name;

  return (
    <>
      <section className={css.first}>
        <div className={cn(css.lead, underSheet)}>
          <Display className={css.headline} style={{ '--fit': charactersToFit([headline]) } as CSSProperties}>
            {headline}
          </Display>
        </div>

        {player ? (
          <div className={css.side}>
            <Mid>{pledgedLine(player.pledged, player.supporters)}</Mid>
            {hitAThon.playerGoal !== null && (
              <div className={css.goal}>
                <GoalBar pledged={player.pledged} goal={hitAThon.playerGoal} />
                <p>
                  {formatPrizeAmount(player.pledged)} of {formatPrizeAmount(hitAThon.playerGoal)} goal
                </p>
              </div>
            )}
            {isOpen && (
              <div className={css.pledge}>
                <Button aria-haspopup='dialog' onClick={() => setChosen(player)}>
                  Pledge
                </Button>
              </div>
            )}
            {status && <StatusText className={css.status}>{status}</StatusText>}
          </div>
        ) : (
          <>
            <div className={cn(css.act, underSheet)}>
              <Mid>{pledgedLine(pledged, supporters)}</Mid>
              {teamGoal !== null && teamGoal > 0 && (
                <div className={css.goal}>
                  <GoalBar pledged={pledged} goal={teamGoal} />
                  <p>
                    {formatPrizeAmount(pledged)} of {formatPrizeAmount(teamGoal)}
                  </p>
                </div>
              )}
              {status && <StatusText className={css.status}>{status}</StatusText>}
            </div>
            <div className={css.side}>
              {isOpen && (
                <h2>
                  <Mid as='span'>Pick a player to pledge.</Mid>
                </h2>
              )}
              <ul className={css.players}>
                {players.map((each) => {
                  const amount = `${formatPrizeAmount(each.pledged)} pledged`;
                  const content = (
                    <>
                      <span className={css.name}>{playerTitle(each)}</span>
                      <span className={css.amount}>{amount}</span>
                    </>
                  );
                  return (
                    <li key={each.id}>
                      {isOpen ? (
                        <button
                          type='button'
                          className={css.player}
                          aria-haspopup='dialog'
                          aria-label={`Pledge for ${each.first_name}, ${each.number ? `#${each.number}, ` : ''}${amount}`}
                          onClick={() => setChosen(each)}
                        >
                          {content}
                        </button>
                      ) : (
                        <div className={css.player}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </section>

      <section className={css.more}>
        <div className={css.organizer}>{organizer}</div>
      </section>

      {chosen && (
        <PledgeSheet
          key={chosen.id}
          contestId={hitAThon.id}
          player={chosen}
          pitchesPerPlayer={hitAThon.pitchesPerPlayer}
          paymentOptions={paymentOptions}
          colors={colors}
          onClose={() => setChosen(null)}
        />
      )}
    </>
  );
}
