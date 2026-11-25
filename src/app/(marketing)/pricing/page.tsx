import type { Metadata } from 'next';

import { PricingSection } from '@/features/pricing/components/pricing-section';

export const metadata: Metadata = {
  title: 'Pricing - Fundwell',
  description: 'One fundraiser is free. Pro runs more.',
};

export default async function PricingPage() {
  return <PricingSection isPricingPage />;
}
