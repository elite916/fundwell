import Link from 'next/link';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { Panel, Tag } from '@/components/studio/dashboard/dash-page';
import { ProductWithPrices, SubscriptionWithProduct } from '@/features/pricing/types';
import { formatDate } from '@/utils/date-formatters';

import css from '@/components/studio/setup/setup.module.css';

interface SubscriptionCardProps {
  subscription: SubscriptionWithProduct | null;
  products: ProductWithPrices[];
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trialing',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
  past_due: 'Past Due',
  unpaid: 'Unpaid',
  paused: 'Paused',
};

/** Something to sort out: shown on black. */
const PROBLEM_STATUSES = ['canceled', 'incomplete_expired', 'past_due', 'unpaid'];

export function SubscriptionCard({ subscription, products }: SubscriptionCardProps) {
  const productId = subscription?.prices?.products?.id;
  const product = productId ? products.find((p) => p.id === productId) : null;

  const planName = product?.name ?? 'Free Plan';
  const price = subscription?.prices;
  const status = subscription?.status;

  const formatPrice = () => {
    if (!price?.unit_amount) return null;
    const amount = price.unit_amount / 100;
    const interval = price.interval === 'year' ? 'year' : 'month';
    return `$${amount.toFixed(2)}/${interval}`;
  };

  // Only active and trialing subscriptions have a next billing date
  const willBill = status === 'active' || status === 'trialing';
  const nextBillingDate =
    willBill && subscription?.current_period_end ? formatDate(subscription.current_period_end) : null;
  const isOverdue = status === 'past_due' || status === 'unpaid';

  return (
    <Panel>
      <div className={css.spread}>
        <h2>{planName}</h2>
        {status && (
          <Tag className={PROBLEM_STATUSES.includes(status) ? css.tagDark : undefined}>
            {STATUS_LABELS[status] ?? status}
          </Tag>
        )}
      </div>
      {price && <p className={css.price}>{formatPrice()}</p>}
      {nextBillingDate && <p className={css.soft}>Next billing: {nextBillingDate}</p>}
      {isOverdue && (
        <p className={css.soft}>Your last payment didn&apos;t go through. Update your card to get Pro back.</p>
      )}
      {!subscription && <p className={css.soft}>Upgrade to unlock unlimited contests</p>}
      {subscription ? (
        // A plain <a>, not <Link>: every request opens a Stripe portal session.
        // Link prefetches it, and on a click requests it twice.
        <DashButton asChild className={css.cardAction}>
          <a href='/manage-subscription'>Manage Subscription</a>
        </DashButton>
      ) : (
        <DashButton asChild className={css.cardAction}>
          <Link href='/pricing'>Upgrade</Link>
        </DashButton>
      )}
    </Panel>
  );
}
