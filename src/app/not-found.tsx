import type { Metadata } from 'next';

import { MarketingHeader } from '@/components/layout/marketing-header';
import { StudioPage } from '@/components/studio/shell/studio-page';
import { TextLink } from '@/components/studio/text-link';
import { Display } from '@/components/studio/type';

import css from './not-found.module.css';

export const metadata: Metadata = { title: 'Page not found - Fundwell' };

export default function NotFound() {
  return (
    <StudioPage header={<MarketingHeader />}>
      <div className={css.screen}>
        <Display as='h1' className={css.title}>
          Page not found
        </Display>
        <TextLink look='button' href='/' className={css.button}>
          Go to home
        </TextLink>
      </div>
    </StudioPage>
  );
}
