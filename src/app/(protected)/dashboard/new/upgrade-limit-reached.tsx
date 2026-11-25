'use client';

import { useState } from 'react';
import Link from 'next/link';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { BackLink, DashPage, PageHead, Panel } from '@/components/studio/dashboard/dash-page';
import type { Price } from '@/features/pricing/types';
import { UpgradeModal } from '@/features/subscriptions/components/upgrade-modal';

import css from '@/components/studio/setup/setup.module.css';

interface UpgradeLimitReachedProps {
  currentCount: number;
  proPrice: Price | null;
}

export function UpgradeLimitReached({ currentCount, proPrice }: UpgradeLimitReachedProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <DashPage className={css.scale}>
      <BackLink href='/dashboard'>Back to Dashboard</BackLink>
      <PageHead title='Upgrade Required' sub={["You've reached your contest limit"]} />

      <Panel className={css.narrow}>
        <h2>Free Plan Limit Reached</h2>
        <p className={css.limitText}>
          You currently have {currentCount} active contest{currentCount !== 1 ? 's' : ''}. Free accounts can have 1
          active contest at a time.
        </p>

        {/* Options */}
        <ul className={css.limitOptions}>
          <li>Delete an existing contest to create a new one</li>
          <li>Or upgrade to Pro for unlimited contests</li>
        </ul>

        {/* Buttons */}
        <div className={css.row}>
          <DashButton onClick={() => setShowModal(true)}>Upgrade to Pro</DashButton>
          <DashButton asChild look='quiet'>
            <Link href='/dashboard'>View My Contests</Link>
          </DashButton>
        </div>
      </Panel>

      {/* Modal */}
      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        proPrice={proPrice}
        currentCount={currentCount}
      />
    </DashPage>
  );
}
