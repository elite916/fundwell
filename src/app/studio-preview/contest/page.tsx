import type { Metadata } from 'next';

import { previewOnly } from '../preview-only';

import { ContestPreview } from './contest-preview';

export const metadata: Metadata = { title: 'Studio preview: contest', robots: { index: false, follow: false } };

const STATES = ['open', 'locked', 'playing', 'done'] as const;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await previewOnly();
  const { state, primary, secondary } = await searchParams;

  return (
    <ContestPreview
      state={STATES.find((s) => s === state) ?? 'open'}
      primary={primary ? `#${primary}` : '#1d4f91'}
      secondary={secondary ? `#${secondary}` : '#e2b53c'}
    />
  );
}
