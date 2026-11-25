import type { PriceCardVariant } from './models/product-metadata';
import type { Price } from './types';

export type PlanButton =
  | { kind: 'checkout'; label: string; priceId: string }
  | { kind: 'link'; label: string; href: string }
  | { kind: 'current'; label: string }
  | null;

/** What a plan's button does: signed out, on Free and on Pro. */
export function planButton({
  variant,
  price,
  isLoggedIn,
  hasPro,
}: {
  variant: PriceCardVariant;
  price: Pick<Price, 'id' | 'unit_amount'> | null | undefined;
  isLoggedIn: boolean;
  hasPro: boolean;
}): PlanButton {
  const isPro = variant === 'pro';

  // Nobody on Pro is offered Free.
  if (!isPro && hasPro) return null;

  if (price && price.unit_amount !== 0 && !hasPro) {
    const proLabel = isLoggedIn ? 'Upgrade to Pro' : 'Sign up to subscribe';
    const freeLabel = isLoggedIn ? 'Get Started' : 'Get started free';
    return { kind: 'checkout', label: isPro ? proLabel : freeLabel, priceId: price.id };
  }
  if (!price) return { kind: 'link', label: 'Contact Us', href: '/support' };
  if (!isLoggedIn) return { kind: 'link', label: 'Get started free', href: '/signup' };
  return { kind: 'current', label: 'Current Plan' };
}
