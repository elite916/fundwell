import { Soft, textStyle } from '@/components/studio/type';
import { getUser } from '@/features/account/controllers/get-user';
import { PricingCard } from '@/features/pricing/components/price-card';
import { getProducts } from '@/features/pricing/controllers/get-products';
import { hasActiveSubscription } from '@/features/subscriptions/has-active-subscription';
import { hasOverdueSubscription } from '@/features/subscriptions/has-overdue-subscription';
import { cn } from '@/utils/cn';

import { createCheckoutAction } from '../actions/create-checkout-action';

import css from './pricing.module.css';

/** Figma's Pricing section, on home and on the pricing page. The page adds Monthly / Yearly and the note. */
export async function PricingSection({ isPricingPage = false }: { isPricingPage?: boolean }) {
  const [products, user] = await Promise.all([getProducts(), getUser()]);
  const isLoggedIn = !!user;
  const [hasPro, isOverdue] = await Promise.all([
    hasActiveSubscription(user?.id ?? null),
    hasOverdueSubscription(user?.id ?? null),
  ]);
  const Heading = isPricingPage ? 'h1' : 'h2';

  return (
    <section className={css.section}>
      <Heading className={cn(textStyle.displayL, css.heading)}>One fundraiser is free. Pro runs more.</Heading>
      <div className={css.side}>
        <div className={css.plans}>
          {products.map((product) => (
            <PricingCard
              key={product.id}
              product={product}
              createCheckoutAction={createCheckoutAction}
              isLoggedIn={isLoggedIn}
              hasPro={hasPro}
              isOverdue={isOverdue}
              hasIntervals={isPricingPage}
              heading={isPricingPage ? 'h2' : 'h3'}
            />
          ))}
        </div>
        {isPricingPage && (
          <Soft className={css.why}>
            We offer a free plan so anyone can run a fundraiser. You can host one fundraiser at a time, and Pro removes
            that limit.
          </Soft>
        )}
      </div>
    </section>
  );
}
