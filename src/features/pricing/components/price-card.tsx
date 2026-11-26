'use client';

import { useId, useState } from 'react';

import { Button } from '@/components/studio/button';
import { TextLink } from '@/components/studio/text-link';
import { Display, Mid, Soft } from '@/components/studio/type';
import { cn } from '@/utils/cn';

import { productMetadataSchema } from '../models/product-metadata';
import { planButton } from '../plan-button';
import type { BillingInterval, ProductWithPrices } from '../types';

import css from './pricing.module.css';

const INTERVALS: { value: BillingInterval; label: string }[] = [
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

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

  const monthPrice = product.prices.find((price) => price.interval === 'month')?.unit_amount;
  const yearPrice = product.prices.find((price) => price.interval === 'year')?.unit_amount;
  const isYearly = interval === 'year' && yearPrice != null;
  const amount = isYearly ? yearPrice : monthPrice;
  const isFree = amount === 0;
  const dollars = amount == null ? 'Custom' : `$${amount / 100}`;

  return (
    <div className={css.plan}>
      <Mid as={heading}>{product.name}</Mid>
      {isFree ? (
        <Display className={css.free}>{dollars}</Display>
      ) : (
        <Mid aria-live='polite'>
          {dollars}
          {amount != null && (isYearly ? ' a year' : ' a month')}
        </Mid>
      )}
      {hasIntervals && product.prices.length > 1 && (
        <fieldset className={css.intervals}>
          <legend className={css.legend}>Billing</legend>
          {INTERVALS.map(({ value, label }) => (
            <label key={value} className={css.interval}>
              <input
                type='radio'
                name={groupName}
                value={value}
                checked={interval === value}
                onChange={() => setInterval(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      )}
      <Soft className={css.includes}>
        {metadata.activeContests === '1' ? 'One active fundraiser at a time' : 'Unlimited active fundraisers'}
        <br />
        {metadata.priceCardVariant === 'pro'
          ? 'Everything in Free'
          : 'Your logo and colors, payment tracking, and emails to winners'}
      </Soft>
      <div className={cn(css.action, !button && css.none)}>
        {button?.kind === 'checkout' && (
          <Button onClick={() => createCheckoutAction({ priceId: button.priceId })}>{button.label}</Button>
        )}
        {button?.kind === 'link' && (
          <TextLink look='button' href={button.href}>
            {button.label}
          </TextLink>
        )}
        {button?.kind === 'portal' && (
          <Button asChild>
            <a href={button.href}>{button.label}</a>
          </Button>
        )}
        {button?.kind === 'current' && <Button disabled>{button.label}</Button>}
      </div>
    </div>
  );
}
