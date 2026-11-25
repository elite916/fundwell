import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { TextLink } from '@/components/studio/text-link';
import { Soft } from '@/components/studio/type';

import { TextItem, TextPage, TextSection } from '../_text/text-page';

export const metadata: Metadata = {
  title: 'About - Fundwell',
  description: 'Making game day fundraisers simple for everyone',
};

const AUDIENCES = [
  { title: 'Schools & PTAs', description: 'Fund classroom supplies, field trips, and school events.' },
  { title: 'Sports Teams', description: 'Cover equipment, travel, and tournament fees.' },
  { title: 'Nonprofits', description: 'Support your cause with engaging game day events.' },
];

const VALUES = [
  { title: 'Simple', description: 'No complicated setup or training needed.' },
  { title: 'Transparent', description: 'Clear pricing, no hidden fees.' },
  { title: 'Community-focused', description: 'Built by fundraisers, for fundraisers.' },
  {
    title: 'You keep 100% of funds',
    description:
      'We never touch the money. Participants pay you directly through your own Venmo/PayPal, so every dollar raised goes to your team.',
  },
  {
    title: 'No experience needed',
    description: 'If you can send a text, you can run a squares contest. Share your link and we handle the rest.',
  },
];

export default function AboutUsPage(): ReactElement {
  return (
    <TextPage title='About Fundwell' intro={<Soft>Making game day fundraisers simple for everyone</Soft>}>
      <TextSection title='Built for your organization'>
        {AUDIENCES.map((item) => (
          <TextItem key={item.title} title={item.title}>
            {item.description}
          </TextItem>
        ))}
      </TextSection>
      <TextSection title='Why Fundwell exists'>
        <Soft>
          We saw coaches spending hours managing spreadsheets and paper grids for game day fundraisers. Whether
          it&apos;s youth baseball, softball, basketball, or football teams, coaches were juggling practices, games, AND
          fundraising administration.
        </Soft>
        <Soft>
          Tracking payments manually, coordinating with dozens of participants, and figuring out winners—it was a lot of
          work for something that should be fun.
        </Soft>
        <Soft>
          We built Fundwell to simplify all of this, so you can focus on what really matters: raising funds and bringing
          your community together.
        </Soft>
        <Soft>
          That&apos;s why we offer a free plan—you can run one contest at a time. Our paid plans are intentionally
          affordable because we&apos;re not here to make a fortune. We just want to cover our server costs and keep
          Fundwell running for everyone who needs it.
        </Soft>
      </TextSection>
      <TextSection title='What makes us different'>
        {VALUES.map((item) => (
          <TextItem key={item.title} title={item.title}>
            {item.description}
          </TextItem>
        ))}
      </TextSection>
      <TextSection title='Ready to get started?'>
        <TextLink look='button' href='/signup'>
          Start a fundraiser
        </TextLink>
      </TextSection>
    </TextPage>
  );
}
