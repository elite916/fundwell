import type { Metadata } from 'next';

import { StillPicture } from '@/components/studio/scene/scene-still';
import { STILLS } from '@/components/studio/scene/stills';
import { TextLink } from '@/components/studio/text-link';
import { Display, Soft } from '@/components/studio/type';
import { PricingSection } from '@/features/pricing/components/pricing-section';

import { HomeFilm } from './_home/home-film';

import css from './_home/home.module.css';

export const metadata: Metadata = {
  title: 'Fundwell - Fund your team with a game',
  description: 'Pick a fundraiser, share one link, and track payments. Run squares on any football game.',
};

export default function HomePage() {
  return (
    <>
      <HomeFilm />
      <MoneySection />
      <PricingSection />
      <ClosingSection />
    </>
  );
}

function MoneySection() {
  return (
    <section className={css.money}>
      <Display as='h2' className={css.moneyTitle}>
        <span>
          Supporters pay you
          <br /> directly.
        </span>{' '}
        <span>
          Fundwell takes
          <br /> no cut.
        </span>
      </Display>
      <Soft className={css.moneySay}>
        You pay the winners, and your team keeps the rest. Payment apps may charge their own fees.
      </Soft>
    </section>
  );
}

function ClosingSection() {
  return (
    <section className={css.closing}>
      <StillPicture still={STILLS.closing} className={css.closingStill} />
      <Display as='h2' className={css.closingTitle}>
        Ready to start your team’s fundraiser?
      </Display>
      <TextLink look='button' href='/signup' className={css.closingButton}>
        Start a fundraiser
      </TextLink>
    </section>
  );
}
