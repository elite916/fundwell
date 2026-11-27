import type { Metadata } from 'next';
import Image from 'next/image';
import type { ReactElement } from 'react';

import { TextLink } from '@/components/studio/text-link';
import { Mid, Soft } from '@/components/studio/type';

import arrowRight from '../_home/arrow-right.svg';
import { TextPage } from '../_text/text-page';

import css from './about-us.module.css';

export const metadata: Metadata = {
  title: 'About - Fundwell',
  description: 'Fundwell helps teams and groups raise money with a game.',
};

export default function AboutUsPage(): ReactElement {
  return (
    <TextPage title='About Fundwell'>
      <div className={css.text}>
        <Mid className={css.lead}>Fundwell helps teams and groups raise money with a game.</Mid>
        <Soft>
          You set up a fundraiser and share one link. Supporters pay you directly, and Fundwell takes no cut. You pay
          the winners, and your team keeps the rest. Payment apps may charge their own fees.
        </Soft>
        <Soft>Squares and hit-a-thons are both ready.</Soft>
        <TextLink look='button' href='/signup' className={css.button}>
          Start a fundraiser
          <Image src={arrowRight} alt='' width={24} height={24} />
        </TextLink>
      </div>
    </TextPage>
  );
}
