import { redirect } from 'next/navigation';

import { DashPage, PageHead } from '@/components/studio/dashboard/dash-page';
import { getSubscription } from '@/features/account/controllers/get-subscription';
import { getUser } from '@/features/account/controllers/get-user';
import { getProducts } from '@/features/pricing/controllers/get-products';
import { SubscriptionCard } from '@/features/subscriptions/components/subscription-card';
import { UsageCard } from '@/features/subscriptions/components/usage-card';
import { getContestLimit } from '@/features/subscriptions/get-contest-limit';
import { getUsageStats } from '@/features/subscriptions/queries/get-usage-stats';

import css from '@/components/studio/setup/setup.module.css';

export default async function BillingPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const [subscription, products, contestLimit, usageStats] = await Promise.all([
    getSubscription(),
    getProducts(),
    getContestLimit(user.id),
    getUsageStats(user.id),
  ]);

  return (
    <DashPage className={css.scale}>
      <div className={css.noBack}>
        <PageHead title='Billing' />
      </div>

      <div className={css.cards}>
        <SubscriptionCard subscription={subscription} products={products} />
        <UsageCard activeContests={usageStats.activeContests} limit={contestLimit.limit} />
      </div>
    </DashPage>
  );
}
