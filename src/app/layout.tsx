import { PropsWithChildren, Suspense } from 'react';
import type { Metadata } from 'next';
import { Big_Shoulders, Figtree } from 'next/font/google';

import { RouteProgress } from '@/components/shared';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/utils/cn';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

// Figtree for text, Big Shoulders for display type. Variable fonts, so every weight comes in one file. Latin is
// preloaded; latin-ext (names like "Łukasz Dvořák") downloads only when a page uses one of its characters.
const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
});

// Figma's "Big Shoulders Display" is this family at its largest optical size. `opsz` lets the CSS pick that size.
// Next has no fallback metrics for it, so the CSS names its own fallbacks.
const bigShoulders = Big_Shoulders({
  variable: '--font-big-shoulders',
  subsets: ['latin'],
  axes: ['opsz'],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'Fundwell - Game Day Squares Fundraiser',
  description:
    'Host your game day squares fundraiser with Fundwell. Create contests, let participants claim squares, and manage payments easily.',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang='en' className='h-full'>
      <body className={cn('h-full font-sans antialiased', figtree.variable, bigShoulders.variable)}>
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
