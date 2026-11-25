'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

import { DashButton, IconButton } from '@/components/studio/dashboard/dash-button';

import css from './upgrade-banner.module.css';

const STORAGE_KEY = 'upgrade-banner-dismissed';

interface UpgradeBannerProps {
  activeContestCount?: number;
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
};

export function UpgradeBanner({ activeContestCount }: UpgradeBannerProps) {
  const wasDismissed = useSyncExternalStore(
    subscribe,
    () => !!localStorage.getItem(STORAGE_KEY),
    () => true
  );
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  if (wasDismissed || isDismissed) return null;

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
        <X aria-hidden='true' width={18} height={18} strokeWidth={1.8} />
      </IconButton>
    </div>
  );
}
