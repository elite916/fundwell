import type { Metadata } from 'next';

import { Button } from '@/components/studio/button';
import { contrastRatio, organizerColors, readableOn } from '@/components/studio/color';
import { BoardLegend } from '@/components/studio/grid/board-legend';
import { SquaresBoard } from '@/components/studio/grid/squares-board';
import { TileChip } from '@/components/studio/grid/tile';
import { Select } from '@/components/studio/select';
import { OrganizerHeader } from '@/components/studio/shell/organizer-header';
import { SiteHeader } from '@/components/studio/shell/site-header';
import { StudioPage } from '@/components/studio/shell/studio-page';
import { StatusText } from '@/components/studio/status-text';
import { TextField } from '@/components/studio/text-field';
import { TextLink } from '@/components/studio/text-link';
import { Display, Mid, Soft } from '@/components/studio/type';

import { COL_NUMBERS, COL_TEAM, CONTEST_NAME, exampleScores, exampleSquares, ROW_NUMBERS, ROW_TEAM } from './data';
import { previewOnly } from './preview-only';
import { SceneSwitch } from './scene-switch';
import { SheetSamples } from './sheet-samples';

import css from './preview.module.css';

export const metadata: Metadata = { title: 'Studio preview', robots: { index: false, follow: false } };

const SURFACES = ['bg', 'sheet', 'field', 'tile', 'tile-open', 'bed', 'ink', 'soft', 'line', 'lime', 'lime-side'];
const ORGANIZERS = [
  ['#1d4f91', '#e2b53c'],
  ['#F97316', '#D97706'],
  ['#ffffff', '#ffd400'],
  ['#8fe52f', '#7c3aed'],
  ['#777777', '#000000'],
  ['not a color', ''],
];
const TEAMS = { rowTeamName: ROW_TEAM, colTeamName: COL_TEAM, rowNumbers: ROW_NUMBERS, colNumbers: COL_NUMBERS };

export default async function Page() {
  await previewOnly();

  return (
    <StudioPage
      header={
        <SiteHeader
          links={[
            { href: '/pricing', label: 'Pricing' },
            { href: '/login', label: 'Log in' },
          ]}
        />
      }
    >
      <div className={css.samples}>
        <Mid as='h1'>Studio components</Mid>
        <p className={css.row}>
          <TextLink href='/studio-preview/contest?state=open'>Open</TextLink>
          <TextLink href='/studio-preview/contest?state=locked'>Locked</TextLink>
          <TextLink href='/studio-preview/contest?state=playing'>Playing</TextLink>
          <TextLink href='/studio-preview/contest?state=done'>Done</TextLink>
          <TextLink href='/studio-preview/home'>Scene</TextLink>
        </p>

        <section>
          <Mid as='h2'>Colors</Mid>
          <ul className={css.swatches}>
            {SURFACES.map((name) => (
              <li key={name}>
                <span style={{ background: `var(--studio-${name})` }} />
                {name}
              </li>
            ))}
          </ul>
          <ul className={css.swatches}>
            {ORGANIZERS.map(([primary, secondary]) => (
              <li key={primary} style={organizerColors(primary, secondary)}>
                <span className={css.organizerSwatch}>Aa</span>
                <span className={css.markSwatch}>EC</span>
                {primary}, {contrastRatio(primary, readableOn(primary)).toFixed(1)}:1
              </li>
            ))}
          </ul>
        </section>

        <section>
          <Mid as='h2'>Type</Mid>
          <Display>
            Otters 11
            <br />
            Herons 14
          </Display>
          <Mid>Robin Sample won halftime</Mid>
          <Soft>$168 of $210, quiet text.</Soft>
          <Soft small>Small quiet text.</Soft>
        </section>

        <section>
          <Mid as='h2'>Buttons and links</Mid>
          <p className={css.row}>
            <Button>Claim square</Button>
            <Button pending>Claim square</Button>
            <TextLink look='button' href='/studio-preview'>
              Start a fundraiser
            </TextLink>
            <Button look='link'>Share</Button>
            <Button look='link' disabled>
              Share
            </Button>
            <TextLink href='/studio-preview'>See results</TextLink>
          </p>
        </section>

        <section className={css.narrow}>
          <Mid as='h2'>Fields</Mid>
          <TextField label='First name' defaultValue='Jamie' />
          <TextField label='Email' error='Enter an email like name@example.com' defaultValue='jamie' />
          <TextField
            label='Venmo handle'
            note='(optional)'
            placeholder='@username'
            hint='If you win, the organizer can use this to pay you.'
          />
          <TextField label='Who sent you?' defaultValue='Robin Sample' readOnly />
          <Select look='form' label='Who sent you?' note='(optional)' defaultValue=''>
            <option value=''>No one / Found it myself</option>
            <option>Robin Sample</option>
          </Select>
          <Select label='Find your squares'>
            <option value=''>Choose a name</option>
            <option>Robin Sample</option>
          </Select>
        </section>

        <section>
          <Mid as='h2'>Sheets</Mid>
          <SheetSamples />
        </section>

        <section>
          <Mid as='h2'>Status</Mid>
          <StatusText detail='$168'>Robin Sample won halftime</StatusText>
          <StatusText tone='soft'>Nobody claimed that square.</StatusText>
        </section>

        <section>
          <Mid as='h2'>Organizer header</Mid>
          <div className={css.headerBox} style={organizerColors('#1d4f91', '#e2b53c')}>
            <OrganizerHeader
              contestName={CONTEST_NAME}
              host='Hosted by Pretend Team Boosters'
              action={<Button look='link'>Share</Button>}
            />
          </div>
        </section>

        <section>
          <Mid as='h2'>Tiles</Mid>
          <p className={css.row}>
            <TileChip payment='available' />
            <TileChip payment='pending' />
            <TileChip payment='paid' />
            <TileChip payment='paid' found />
            <TileChip payment='paid' won='past' />
            <TileChip payment='paid' won='winner' />
          </p>
          <BoardLegend hasWinner hasEarlierWinner />
        </section>

        <section style={organizerColors('#1d4f91', '#e2b53c')} className={css.boards}>
          <div>
            <Mid as='h2'>Read-only, no numbers yet</Mid>
            <SquaresBoard
              squares={exampleSquares(62, 31)}
              {...TEAMS}
              rowNumbers={null}
              colNumbers={null}
              axisNote='Otters down, Herons across'
            />
          </div>
          <div>
            <Mid as='h2'>Read-only, found and all four winners</Mid>
            <SquaresBoard
              squares={exampleSquares(84, 60)}
              {...TEAMS}
              scores={exampleScores(4)}
              findName='robin  sample'
              axisNote='Otters’ last digit down, Herons’ across'
            />
          </div>
        </section>

        <section>
          <Mid as='h2'>Scene</Mid>
          <SceneSwitch />
        </section>
      </div>
    </StudioPage>
  );
}
