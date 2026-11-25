'use client';

import { useState } from 'react';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { createCheckoutAction } from '@/features/pricing/actions/create-checkout-action';
import type { Price } from '@/features/pricing/types';

import css from '@/components/studio/setup/setup.module.css';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  proPrice: Price | null;
  currentCount: number;
}

export function UpgradeModal({ isOpen, onClose, proPrice, currentCount }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!proPrice) return;
    setIsLoading(true);
    try {
      await createCheckoutAction({ priceId: proPrice.id });
    } catch (error) {
      // redirect() throws a special error that Next.js handles - re-throw it
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        throw error;
      }
      // Handle actual errors - consider adding toast notification here
      console.error('Checkout failed:', error);
      setIsLoading(false);
    }
  };

  const formatPrice = () => {
    if (!proPrice?.unit_amount) return '';
    return `$${proPrice.unit_amount / 100}/${proPrice.interval}`;
  };

  return (
    <DashDialog
      open={isOpen}
      onClose={onClose}
      title='Upgrade to Create More Contests'
      description="You've reached the limit for free accounts (1 contest)"
    >
      <div className={css.plans}>
        {/* Free Plan */}
        <div>
          <h3>Free Plan</h3>
          <ul className={css.soft}>
            <li>1 active contest ({currentCount}/1)</li>
          </ul>
        </div>

        {/* Pro Plan */}
        <div>
          <h3>Pro Plan</h3>
          <ul>
            <li>Unlimited contests</li>
            <li>Priority support</li>
          </ul>
        </div>
      </div>

      {proPrice && <p className={css.planPrice}>{formatPrice()}</p>}

      <DashDialogFoot>
        <DashButton look='quiet' onClick={onClose} disabled={isLoading}>
          Cancel
        </DashButton>
        <DashButton onClick={handleUpgrade} disabled={isLoading || !proPrice} aria-busy={isLoading}>
          {isLoading ? 'Redirecting...' : 'Upgrade to Pro'}
        </DashButton>
      </DashDialogFoot>
    </DashDialog>
  );
}
