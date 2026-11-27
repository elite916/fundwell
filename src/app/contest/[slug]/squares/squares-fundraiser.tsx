'use client';

import { type CSSProperties, useId, useState } from 'react';

import { BoardLegend } from '@/components/studio/grid/board-legend';
import { ClaimBoard } from '@/components/studio/grid/claim-board';
import { claimantName, claimantNames, type GridSquare, squaresOf, winnersOf } from '@/components/studio/grid/model';
import { ScoreBar } from '@/components/studio/grid/score-bar';
import { Select } from '@/components/studio/select';
import { StatusText } from '@/components/studio/status-text';
import { underSheet } from '@/components/studio/theme';
import { Display, Mid, textStyle } from '@/components/studio/type';
import { QuarterDisplayNames } from '@/features/contests/constants';
import type { PaymentOption, Player, Score } from '@/features/contests/types';
import { useRealtimeSquares } from '@/hooks/use-realtime-squares';
import { useRefreshOnScores } from '@/hooks/use-refresh-on-scores';
import { cn } from '@/utils/cn';

import { ClaimSheet } from './claim-sheet';
import { prizeList } from './prizes';
import { axisNote, charactersToFit, foundText, statusOf } from './status';
import type { SquaresContest } from './types';

import css from './squares.module.css';

/** Wide enough for the claim form to sit beside the board instead of in a sheet. Same as the page's two columns. */
const BESIDE_THE_BOARD = '(min-width: 1000px)';

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
}: SquaresFundraiserProps) {
  const squares = useRealtimeSquares(contest.id, initialSquares, realtime);
  useRefreshOnScores(contest.id, realtime);
  const [pickedName, setPickedName] = useState('');
  const [chosen, setChosen] = useState<GridSquare | null>(null);
  // Card beside the board on wide screens, a sheet on phones: decided when a square is pressed
  const [isBeside, setIsBeside] = useState(false);
  const prizesId = useId();

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
  const headline = status.headline?.filter((line) => line !== undefined) ?? [];
  const board = {
    squares,
    rowTeamName: contest.row_team_name ?? '',
    colTeamName: contest.col_team_name ?? '',
    rowNumbers: contest.row_numbers,
    colNumbers: contest.col_numbers,
    scores,
  };

  const claimSheet = chosen && (
    <ClaimSheet
      // Beside the board, a new square starts a new form. The sheet stays open while a neighbour is picked.
      key={isBeside ? chosen.id : 'sheet'}
      square={chosen}
      board={board}
      beside={isBeside}
      onChoose={setChosen}
      contestId={contest.id}
      squarePrice={contest.square_price ?? 0}
      paymentOptions={paymentOptions}
      players={contest.enable_player_tracking ? players : null}
      referredBy={referredBy}
      colors={colors}
      onClose={() => setChosen(null)}
    />
  );

  return (
    <div className={css.main}>
      <section className={css.left} aria-label='Squares'>
        <div className={cn(css.status, underSheet)}>
          {status.score ? (
            // Scores are saved as home and away: the rows' team is home
            <ScoreBar
              period={QuarterDisplayNames[status.score.quarter]}
              isHalftime={status.score.quarter === 'q2'}
              live={contest.status === 'in_progress' && status.score.quarter !== 'final'}
              homeTeam={contest.row_team_name ?? ''}
              homeScore={status.score.home_score}
              awayTeam={contest.col_team_name ?? ''}
              awayScore={status.score.away_score}
            />
          ) : (
            <div className={css.lead}>
              <Display className={css.headline} style={{ '--fit': charactersToFit(headline) } as CSSProperties}>
                {headline[0]}
                {headline[1] && <br />}
                {headline[1]}
              </Display>
            </div>
          )}
          {status.news && (
            <div className={css.news}>
              <p className={status.tone === 'strong' ? cn(textStyle.displayM, css.winner) : css.newsText}>
                {status.news}
              </p>
              {status.detail && <p className={css.newsText}>{status.detail}</p>}
            </div>
          )}
        </div>
        <div className={css.squares}>
          <ClaimBoard
            {...board}
            findName={findName}
            chosenSquareId={chosen?.id}
            canClaim={contest.status === 'open'}
            onClaim={(square) => {
              setIsBeside(window.matchMedia(BESIDE_THE_BOARD).matches);
              setChosen(square);
            }}
            onSelectClaimed={(square) => {
              const name = listedName(claimantName(square));
              setPickedName(name === findName ? '' : name);
            }}
            axisNote={axisNote(contest)}
            className={css.board}
          />
          <BoardLegend
            hasWinner={!!latestId}
            hasEarlierWinner={[...quartersById.keys()].some((id) => id !== latestId)}
            className={css.legend}
          />
          {names.length > 0 && (
            <div className={css.find}>
              <Select
                label='Find your squares'
                look='form'
                value={findName}
                onChange={(event) => setPickedName(event.target.value)}
                className={css.findSelect}
              >
                <option value=''>Choose a name</option>
                {names.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </Select>
              <StatusText live tone='soft' className={css.found}>
                {foundText(contest, squares, findName)}
              </StatusText>
            </div>
          )}
        </div>
      </section>

      <div className={css.right}>
        {isBeside && claimSheet}
        {prizes && (
          <section aria-labelledby={prizesId}>
            <h2 id={prizesId}>
              <Mid as='span'>{prizes.kind === 'winners' ? 'Winners' : 'Payouts if all squares sell'}</Mid>
            </h2>
            <dl className={cn(css.prizes, prizes.kind === 'winners' && css.winners)}>
              {prizes.lines.map(({ label, prize, now, winner, notes }) => (
                <div key={label}>
                  <dt>
                    <span className={css.prizeLabel}>{label}</span>
                    {winner && <span className={css.prizeWinner}>{winner}</span>}
                    {notes.map((note) => (
                      <small key={note}>{note}</small>
                    ))}
                  </dt>
                  <dd className={css.amount}>{prize}</dd>
                  {now && <dd className={css.now}>({now} now)</dd>}
                </div>
              ))}
              {prizes.total && (
                <div className={css.sum}>
                  <dt>Total Payouts</dt>
                  <dd className={css.amount}>{prizes.total.prize}</dd>
                  <dd className={css.now}>({prizes.total.now} now)</dd>
                </div>
              )}
              {prizes.leftForTeam && (
                <div className={css.teamShare}>
                  <dt>Left for the team</dt>
                  <dd className={css.amount}>{prizes.leftForTeam}</dd>
                </div>
              )}
            </dl>
          </section>
        )}
      </div>

      {!isBeside && claimSheet}
    </div>
  );
}
