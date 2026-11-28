'use client';

import { useId, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/studio/button';
import { Segmented } from '@/components/studio/setup/fields';
import { Mid, textStyle } from '@/components/studio/type';
import { cn } from '@/utils/cn';

import { productMetadataSchema } from '../models/product-metadata';
import { planButton } from '../plan-button';
import type { BillingInterval, ProductWithPrices } from '../types';

import css from './pricing.module.css';

const INTERVALS: { value: BillingInterval; label: string }[] = [
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

/** Figma's Pricing card. Free's button is Secondary, Pro's is Primary. */
export function PricingCard({
  product,
  createCheckoutAction,
  isLoggedIn,
  hasPro,
  isOverdue,
  hasIntervals,
  heading,
}: {
  product: ProductWithPrices;
  createCheckoutAction: ({ priceId }: { priceId: string }) => void;
  isLoggedIn: boolean;
  hasPro: boolean;
  isOverdue: boolean;
  /** Offer monthly and yearly, where the plan has both. Otherwise monthly. */
  hasIntervals: boolean;
  heading: 'h2' | 'h3';
}) {
  const [interval, setInterval] = useState<BillingInterval>('month');
  const groupName = useId();

  // A plan has no price, one price, or a monthly and a yearly one.
  const price =
    product.prices.length > 1
      ? product.prices.find((price) => price.interval === interval)
      : (product.prices[0] ?? null);
  const metadata = productMetadataSchema.parse(product.metadata);
  const button = planButton({ variant: metadata.priceCardVariant, price, isLoggedIn, hasPro, isOverdue });
  const isPro = metadata.priceCardVariant === 'pro';
  const look = isPro ? 'button' : 'secondary';

  const monthPrice = product.prices.find((price) => price.interval === 'month')?.unit_amount;
  const yearPrice = product.prices.find((price) => price.interval === 'year')?.unit_amount;
  const isYearly = interval === 'year' && yearPrice != null;
  const amount = isYearly ? yearPrice : monthPrice;
  const isFree = amount === 0;
  const dollars = amount == null ? 'Custom' : `$${amount / 100}`;

  return (
    <div className={cn(css.plan, isPro && css.pro)}>
      <Mid as={heading}>{product.name}</Mid>
      <p className={css.price} aria-live={isFree ? undefined : 'polite'}>
        <span className={textStyle.displayL}>{dollars}</span>
        {amount != null && !isFree && (isYearly ? ' a year' : ' a month')}
      </p>
      {hasIntervals && product.prices.length > 1 && (
        <div className={css.billing}>
          <Segmented legend='Billing' name={groupName} value={interval} onChange={setInterval} options={INTERVALS} />
        </div>
      )}
      <div className={css.includes}>
        <p>{metadata.activeContests === '1' ? 'One active fundraiser at a time' : 'Unlimited active fundraisers'}</p>
        <p>{isPro ? 'Everything in Free' : 'Your logo and colors, payment tracking, and emails to winners'}</p>
      </div>
      {button && (
        <div>
          {button.kind === 'checkout' && (
            <Button look={look} onClick={() => createCheckoutAction({ priceId: button.priceId })}>
              {button.label}
            </Button>
          )}
          {button.kind === 'link' && (
            <Button asChild look={look}>
              <Link href={button.href}>{button.label}</Link>
            </Button>
          )}
          {button.kind === 'portal' && (
            <Button asChild look={look}>
              <a href={button.href}>{button.label}</a>
            </Button>
          )}
          {button.kind === 'current' && <Button disabled>{button.label}</Button>}
        </div>
      )}
    </div>
  );
}
