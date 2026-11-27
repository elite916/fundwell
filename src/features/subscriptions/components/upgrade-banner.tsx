'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

import { DashButton, IconButton } from '@/components/studio/dashboard/dash-button';

import css from './upgrade-banner.module.css';

const STORAGE_KEY = 'upgrade-banner-dismissed';
// Its own key, so dismissing the Free banner doesn't hide this one.
const OVERDUE_STORAGE_KEY = 'payment-banner-dismissed';

interface UpgradeBannerProps {
  activeContestCount?: number;
  /** A paid subscription is past due or unpaid. */
  isOverdue?: boolean;
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
};

export function UpgradeBanner({ activeContestCount, isOverdue }: UpgradeBannerProps) {
  const storageKey = isOverdue ? OVERDUE_STORAGE_KEY : STORAGE_KEY;
  const wasDismissed = useSyncExternalStore(
    subscribe,
    () => !!localStorage.getItem(storageKey),
    () => true
  );
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  if (wasDismissed || isDismissed) return null;

  if (isOverdue) {
    return (
      <div className={css.banner}>
        <div>
          <p className={css.title}>Your Pro payment didn&apos;t go through</p>
          <p className={css.soft}>You&apos;re limited to 1 active contest until it&apos;s paid.</p>
        </div>
        {/* A plain <a>, not <Link>: every request opens a Stripe portal session. */}
        <DashButton asChild look='light' className={css.upgrade}>
          <a href='/manage-subscription'>Update payment</a>
        </DashButton>
        <IconButton label='Dismiss' onClick={handleDismiss}>
          <X aria-hidden='true' width={24} height={24} strokeWidth={1.8} />
        </IconButton>
      </div>
    );
  }

  return (
    <div className={css.banner}>
      <div>
        <p className={css.title}>
          You&apos;re on the Free plan {activeContestCount !== undefined && `(${activeContestCount}/1 contests used)`}
        </p>
        <p className={css.soft}>Upgrade to Pro for unlimited contests</p>
      </div>
      <DashButton asChild look='light' className={css.upgrade}>
        <Link href='/pricing'>Upgrade to Pro</Link>
      </DashButton>
      <IconButton label='Dismiss' onClick={handleDismiss}>
        <X aria-hidden='true' width={24} height={24} strokeWidth={1.8} />
      </IconButton>
    </div>
  );
}
