'use client';

import { type CSSProperties, type ReactNode, useState } from 'react';

import { BoardLegend } from '@/components/studio/grid/board-legend';
import { ClaimBoard } from '@/components/studio/grid/claim-board';
import { claimantName, claimantNames, type GridSquare, squaresOf, winnersOf } from '@/components/studio/grid/model';
import { Select } from '@/components/studio/select';
import { StatusText } from '@/components/studio/status-text';
import { underSheet } from '@/components/studio/theme';
import { Display, Mid } from '@/components/studio/type';
import type { PaymentOption, Player, Score } from '@/features/contests/types';
import { useRealtimeSquares } from '@/hooks/use-realtime-squares';
import { useRefreshOnScores } from '@/hooks/use-refresh-on-scores';
import { cn } from '@/utils/cn';

import { ClaimSheet } from './claim-sheet';
import { prizeList } from './prizes';
import { axisNote, charactersToFit, foundText, statusOf } from './status';
import type { SquaresContest } from './types';

import css from './squares.module.css';

interface SquaresFundraiserProps {
  contest: SquaresContest;
  squares: GridSquare[];
  scores: Score[];
  paymentOptions: PaymentOption[];
  /** The player slug in a referral link. */
  referral: string | null;
  colors: CSSProperties;
  /** Subscribe to live changes. Off for PIN contests, whose rows the database hides from visitors. */
  realtime: boolean;
  /** The organizer's image and words, which aren't about squares. */
  organizer: ReactNode;
}

/** Everything on a contest page that is about squares. Another kind of fundraiser would replace this. */
export function SquaresFundraiser({
  contest,
  squares: initialSquares,
  scores,
  paymentOptions,
  referral,
  colors,
  realtime,
  organizer,
}: SquaresFundraiserProps) {
  const squares = useRealtimeSquares(contest.id, initialSquares, realtime);
  useRefreshOnScores(contest.id, realtime);
  const [pickedName, setPickedName] = useState('');
  const [chosen, setChosen] = useState<GridSquare | null>(null);

  const players = (contest.players as Player[] | null) ?? [];
  const referredBy =
    contest.enable_player_tracking && referral
      ? (players.find(({ slug }) => slug.toLowerCase() === referral.toLowerCase()) ?? null)
      : null;

  const status = statusOf(contest, squares, scores);
  const prizes = prizeList(contest, squares, scores);
  const { latestId, quartersById } = winnersOf(scores);

  // Names are typed by hand, so one person's can differ in case or spaces: use the one in the list
  const names = claimantNames(squares);
  const listedName = (name: string) => {
    const [square] = squaresOf(squares, name);
    return names.find((listed) => square && squaresOf([square], listed).length > 0) ?? '';
  };
  const findName = listedName(pickedName);
  const headline = status.headline.filter((line) => line !== undefined);

  return (
    <>
      <section className={css.first} aria-label='Squares'>
        <div className={cn(css.lead, underSheet)}>
          <Display className={css.headline} style={{ '--fit': charactersToFit(headline) } as CSSProperties}>
            {headline[0]}
            {headline[1] && <br />}
            {headline[1]}
          </Display>
        </div>
        <div className={cn(css.act, underSheet)}>
          <StatusText tone={status.tone} detail={status.detail}>
            {status.news}
          </StatusText>
        </div>
        <div className={css.side}>
          <ClaimBoard
            squares={squares}
            rowTeamName={contest.row_team_name ?? ''}
            colTeamName={contest.col_team_name ?? ''}
            rowNumbers={contest.row_numbers}
            colNumbers={contest.col_numbers}
            scores={scores}
            findName={findName}
            chosenSquareId={chosen?.id}
            canClaim={contest.status === 'open'}
            onClaim={setChosen}
            onSelectClaimed={(square) => {
              const name = listedName(claimantName(square));
              setPickedName(name === findName ? '' : name);
            }}
            axisNote={axisNote(contest)}
            className={css.board}
          />
          {names.length > 0 && (
            <div className={css.find}>
              <Select
                label='Find your squares'
                value={findName}
                onChange={(event) => setPickedName(event.target.value)}
                className={css.findSelect}
              >
                <option value=''>Choose a name</option>
                {names.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </Select>
              <StatusText live tone='soft'>
                {foundText(contest, squares, findName)}
              </StatusText>
            </div>
          )}
          <BoardLegend
            hasWinner={!!latestId}
            hasEarlierWinner={[...quartersById.keys()].some((id) => id !== latestId)}
            className={css.legend}
          />
        </div>
      </section>

      <section className={css.more} aria-label='Payouts and organizer'>
        {prizes && (
          <div>
            <h2>
              <Mid as='span'>{prizes.kind === 'winners' ? 'Winners' : 'Payouts if all squares sell'}</Mid>
            </h2>
            <dl className={css.prizes}>
              {prizes.lines.map(({ label, prize, now, notes }) => (
                <div key={label}>
                  <dt>
                    {label}
                    {notes.map((note) => (
                      <small key={note}>{note}</small>
                    ))}
                  </dt>
                  <dd>{prize}</dd>
                  {now && <dd className={css.now}>({now} now)</dd>}
                </div>
              ))}
              {prizes.total && (
                <div className={css.sum}>
                  <dt>Total Payouts</dt>
                  <dd>{prizes.total.prize}</dd>
                  <dd className={css.now}>({prizes.total.now} now)</dd>
                </div>
              )}
              {prizes.leftForTeam && (
                <div className={prizes.total ? undefined : css.sum}>
                  <dt>Left for the team</dt>
                  <dd>{prizes.leftForTeam}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
        <div className={css.organizer}>{organizer}</div>
      </section>

      {chosen && (
        <ClaimSheet
          key={chosen.id}
          square={chosen}
          contestId={contest.id}
          squarePrice={contest.square_price ?? 0}
          paymentOptions={paymentOptions}
          players={contest.enable_player_tracking ? players : null}
          referredBy={referredBy}
          colors={colors}
          onClose={() => setChosen(null)}
        />
      )}
    </>
  );
}
