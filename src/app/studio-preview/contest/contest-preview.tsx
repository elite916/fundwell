'use client';

import { useState } from 'react';

import { Button } from '@/components/studio/button';
import { organizerColors } from '@/components/studio/color';
import { BoardLegend } from '@/components/studio/grid/board-legend';
import { ClaimBoard } from '@/components/studio/grid/claim-board';
import { claimantName, claimantNames, type GridSquare, squaresOf } from '@/components/studio/grid/model';
import { TileChip } from '@/components/studio/grid/tile';
import { Select } from '@/components/studio/select';
import { Sheet } from '@/components/studio/sheet';
import { OrganizerHeader } from '@/components/studio/shell/organizer-header';
import { StudioPage } from '@/components/studio/shell/studio-page';
import { StatusText } from '@/components/studio/status-text';
import { TextField } from '@/components/studio/text-field';
import { underSheet } from '@/components/studio/theme';
import { Display, Mid, Soft } from '@/components/studio/type';
import { cn } from '@/utils/cn';

import { COL_NUMBERS, COL_TEAM, CONTEST_NAME, exampleScores, exampleSquares, ROW_NUMBERS, ROW_TEAM } from '../data';

import css from '../preview.module.css';

type State = 'open' | 'locked' | 'playing' | 'done';

const STATUS: Record<Exclude<State, 'open'>, { headline: [string, string]; news: string; detail?: string }> = {
  locked: {
    headline: ['Waiting for', 'the game'],
    news: 'The numbers are in. Find your squares to see yours.',
  },
  playing: { headline: ['Otters 20', 'Herons 7'], news: 'Robin Sample won halftime', detail: '$168' },
  done: { headline: ['Otters 31', 'Herons 14'], news: 'Final score' },
};

/** The contest page's first screen, put together from the parts. For review only. */
export function ContestPreview({ state, primary, secondary }: { state: State; primary: string; secondary: string }) {
  const squares = state === 'open' ? exampleSquares(62, 51) : exampleSquares(84, 80);
  const [findName, setFindName] = useState('');
  const [chosen, setChosen] = useState<GridSquare | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [errors, setErrors] = useState(false);

  const found = squaresOf(squares, findName);
  const left = squares.filter((square) => square.payment_status === 'available').length;
  const played = { open: 0, locked: 0, playing: 2, done: 4 }[state];
  const colors = organizerColors(primary, secondary);
  const foundText =
    !findName || state === 'open'
      ? findName && `${found.length} ${found.length === 1 ? 'square' : 'squares'}`
      : `${ROW_TEAM}, then ${COL_TEAM}: ${found
          .map((square) => `${ROW_NUMBERS[square.row_index]}⁠–⁠${COL_NUMBERS[square.col_index]}`)
          .join(', ')}`;

  return (
    <StudioPage
      style={colors}
      header={
        <OrganizerHeader
          contestName={CONTEST_NAME}
          host='Hosted by Pretend Team Boosters'
          action={
            <Button look='link' onClick={() => setIsSharing(true)}>
              Share
            </Button>
          }
        />
      }
    >
      <section className={css.first} aria-label='Squares'>
        <div className={cn(css.lead, underSheet)}>
          {state === 'open' ? (
            <Display>
              {left} squares
              <br />
              left
            </Display>
          ) : (
            <Display>
              {STATUS[state].headline[0]}
              <br />
              {STATUS[state].headline[1]}
            </Display>
          )}
        </div>
        <div className={cn(css.act, underSheet)}>
          {state === 'open' ? (
            <StatusText tone='soft'>$10 each, up to 5 per person. Tap any available square to claim it.</StatusText>
          ) : (
            <StatusText tone={state === 'locked' ? 'soft' : 'strong'} detail={STATUS[state].detail}>
              {STATUS[state].news}
            </StatusText>
          )}
        </div>
        <div className={css.side}>
          <ClaimBoard
            squares={squares}
            rowTeamName={ROW_TEAM}
            colTeamName={COL_TEAM}
            rowNumbers={state === 'open' ? null : ROW_NUMBERS}
            colNumbers={state === 'open' ? null : COL_NUMBERS}
            scores={exampleScores(played)}
            findName={findName}
            chosenSquareId={chosen?.id}
            canClaim={state === 'open'}
            onClaim={setChosen}
            onSelectClaimed={(square) =>
              setFindName((name) => (name === claimantName(square) ? '' : claimantName(square)))
            }
            axisNote={
              played > 0 ? `${ROW_TEAM}’ last digit down, ${COL_TEAM}’ across` : `${ROW_TEAM} down, ${COL_TEAM} across`
            }
            className={css.board}
          />
          <div className={css.find}>
            <Select label='Find your squares' value={findName} onChange={(event) => setFindName(event.target.value)}>
              <option value=''>Choose a name</option>
              {claimantNames(squares).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </Select>
            <StatusText live tone='soft'>
              {foundText}
            </StatusText>
          </div>
          <BoardLegend hasWinner={played > 0} hasEarlierWinner={played > 1} className={css.legend} />
        </div>
      </section>

      <Sheet
        open={!!chosen}
        onOpenChange={(open) => !open && setChosen(null)}
        style={colors}
        title='Claim your square'
        mark={<TileChip payment='available' chosen />}
        description={chosen && `Row ${chosen.row_index + 1}, column ${chosen.col_index + 1}, $10`}
      >
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setErrors(true);
          }}
        >
          <TextField label='First name' autoComplete='given-name' error={errors ? 'Enter your first name' : ''} />
          <TextField label='Last name' autoComplete='family-name' error={errors ? 'Enter your last name' : ''} />
          <TextField
            label='Email'
            type='email'
            autoComplete='email'
            error={errors ? 'Enter an email like name@example.com' : ''}
          />
          <TextField label='Venmo handle' note='(optional)' hint='If you win, the organizer can use this to pay you.' />
          <div className={css.end}>
            <Button type='submit'>Claim square</Button>
          </div>
        </form>
      </Sheet>

      <Sheet
        open={isSharing}
        onOpenChange={setIsSharing}
        style={colors}
        title='Share'
        description='Send this link to anyone who might help.'
        footer={
          <>
            <Button>Copy link</Button>
            <Button look='link'>QR code</Button>
          </>
        }
      >
        <Mid className={css.anywhere}>fundwell.us/contest/example-team</Mid>
      </Sheet>

      <Soft small className={css.reviewNote}>
        Review only, made-up data.
      </Soft>
    </StudioPage>
  );
}
