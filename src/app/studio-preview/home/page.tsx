import type { Metadata } from 'next';

import { previewOnly } from '../preview-only';

import { HomePreview } from './home-preview';

export const metadata: Metadata = { title: 'Studio preview: scene', robots: { index: false, follow: false } };

export default async function Page() {
  await previewOnly();
  return <HomePreview />;
}
