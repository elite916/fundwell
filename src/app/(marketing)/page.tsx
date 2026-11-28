import type { Metadata } from 'next';
import Image from 'next/image';

import { organizerColors } from '@/components/studio/color';
import { ScoreBar } from '@/components/studio/grid/score-bar';
import { SquaresBoard } from '@/components/studio/grid/squares-board';
import { Tile, TileChip } from '@/components/studio/grid/tile';
import { TextLink } from '@/components/studio/text-link';
import { studioTheme } from '@/components/studio/theme';
import { textStyle } from '@/components/studio/type';
import { PricingSection } from '@/features/pricing/components/pricing-section';
import { cn } from '@/utils/cn';

import arrowRight from './_home/arrow-right.svg';
import {
  EXAMPLE_COL_NUMBERS,
  EXAMPLE_COLORS,
  EXAMPLE_FIND_NAME,
  EXAMPLE_ROW_NUMBERS,
  EXAMPLE_SCORES,
  EXAMPLE_SQUARES,
} from './_home/example';

import css from './_home/home.module.css';

export const metadata: Metadata = {
  title: 'Fundwell - Fund your team with a game',
  description: 'Pick a fundraiser, share one link, and track payments. Run squares on any football game.',
};

/** Figma's Home */
export default function HomePage() {
  return (
    <>
      <section className={css.hero}>
        <div className={css.heroText}>
          <h1 className={cn(textStyle.displayXl, css.heroTitle)}>Fund your team with a game</h1>
          <p className={textStyle.bodyL}>Pick a fundraiser, share one link, and track payments.</p>
          <StartButton />
        </div>
        <ExampleFundraiser />
      </section>
      <FundraiserTypes />
      <HowSquaresWorks />
      <section className={css.money}>
        <h2 className={cn(textStyle.displayL, css.moneyTitle)}>Supporters pay you directly. Fundwell takes no cut.</h2>
        <p className={cn(textStyle.bodyL, css.moneySay)}>
          You pay the winners, and your team keeps the rest. Payment apps may charge their own fees.
        </p>
      </section>
      <PricingSection />
      <section className={css.closing}>
        <h2 className={cn(textStyle.displayXl, css.closingTitle)}>Ready to start your team’s fundraiser?</h2>
        <StartButton />
      </section>
    </>
  );
}

function StartButton() {
  return (
    <TextLink look='button' href='/signup' className={css.start}>
      Start a fundraiser
      <Image src={arrowRight} alt='' width={24} height={24} />
    </TextLink>
  );
}

/** Figma's Fundraiser preview: a made-up squares fundraiser in a red team's colors */
function ExampleFundraiser() {
  return (
    // The theme again, so the square tokens follow the team colors set here
    <div className={cn(studioTheme, css.example)} style={organizerColors(EXAMPLE_COLORS.team, EXAMPLE_COLORS.accent)}>
      <div className={css.band}>
        <div className={css.team}>
          <p className={textStyle.label}>Example fundraiser · Squares</p>
          <p className={css.teamName}>Hawks Football</p>
        </div>
        <p className={cn(textStyle.label, css.chip)}>
          <span aria-hidden='true' className={css.dot} />
          In progress
        </p>
      </div>
      <div className={css.body}>
        <ScoreBar
          period='Q3'
          live
          homeTeam='Hawks'
          homeScore={24}
          awayTeam='Rivals'
          awayScore={10}
          className={css.score}
        />
        <div className={css.board}>
          <p aria-hidden='true' className={css.awayTeam}>
            Rivals
          </p>
          <p aria-hidden='true' className={css.homeTeam}>
            Hawks
          </p>
          <SquaresBoard
            squares={EXAMPLE_SQUARES}
            rowTeamName='Hawks'
            colTeamName='Rivals'
            rowNumbers={EXAMPLE_ROW_NUMBERS}
            colNumbers={EXAMPLE_COL_NUMBERS}
            scores={EXAMPLE_SCORES}
            findName={EXAMPLE_FIND_NAME}
            className={css.squares}
          />
        </div>
        <ul className={css.legend}>
          <li>
            <TileChip payment='paid'>AB</TileChip> Claimed
          </li>
          <li>
            <TileChip payment='pending'>AB</TileChip> Pending
          </li>
          <li>
            <TileChip payment='paid' won='winner'>
              AB
            </TileChip>{' '}
            Winning
          </li>
          <li>
            <TileChip payment='paid' found>
              ME
            </TileChip>{' '}
            Your square
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Figma's Fundraiser type cards, in Fundwell's own colors */
function FundraiserTypes() {
  return (
    <section className={css.types}>
      <div className={css.type}>
        <div className={css.typeText}>
          <h2 className={textStyle.displayM}>Squares</h2>
          <p className={textStyle.bodyL}>Supporters claim squares on a 10×10 board.</p>
        </div>
        <div className={css.strip}>
          <Tile payment='paid'>JM</Tile>
          <Tile payment='pending'>KT</Tile>
          <Tile payment='available' />
          <Tile payment='paid' won='winner'>
            AL
          </Tile>
          <Tile payment='paid'>RB</Tile>
          <Tile payment='paid' found>
            ME
          </Tile>
          <Tile payment='available' />
        </div>
      </div>
      <div className={cn(css.type, css.hitAThon)}>
        <div className={css.typeText}>
          {/* Non-breaking hyphens, so it never wraps at one */}
          <h2 className={textStyle.displayM}>Hit‑a‑thon</h2>
          <p className={textStyle.bodyL}>Supporters pledge per hit or a flat amount.</p>
        </div>
        <div className={css.player}>
          <p className={textStyle.label}>Example player</p>
          <p className={textStyle.displayL}>12</p>
          <p className={textStyle.displayS}>Sam R.</p>
          <p className={textStyle.label}>#12 · SS</p>
        </div>
      </div>
    </section>
  );
}

function HowSquaresWorks() {
  const steps = ['Share your link', 'People claim squares', 'The score picks the winner'];
  return (
    <section className={css.how}>
      <h2 className={cn(textStyle.displayL, css.howTitle)}>How squares works</h2>
      <ol className={css.steps}>
        {steps.map((step, index) => (
          <li key={step}>
            <span aria-hidden='true' className={cn(textStyle.displayL, css.number)}>
              {index + 1}
            </span>
            <span className={textStyle.displayS}>{step}</span>
          </li>
        ))}
      </ol>
      <p className={cn(textStyle.bodyL, css.howSay)}>
        Run it on any football game, from a rivalry night to the Super Bowl.
      </p>
    </section>
  );
}
