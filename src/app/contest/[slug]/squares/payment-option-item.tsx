'use client';

import { useState } from 'react';
import Image from 'next/image';

import { Button } from '@/components/studio/button';
import { srOnly } from '@/components/studio/theme';
import type { PaymentOption, PaymentOptionType } from '@/features/contests/types';
import { logger } from '@/utils/logger';
import { generatePaymentUrl } from '@/utils/payment-url-generator';

import css from './squares.module.css';

const NAMES: Record<PaymentOptionType, string> = {
  venmo: 'Venmo',
  paypal: 'PayPal',
  cashapp: 'Cash App',
  zelle: 'Zelle',
};

/** One way to pay: a link to the app, the handle to copy, and whatever else the organizer added. */
export function PaymentOptionItem({ option }: { option: PaymentOption }) {
  const [isCopied, setIsCopied] = useState(false);
  const name = NAMES[option.type];
  const paymentUrl = generatePaymentUrl(option.type, option.handle_or_link);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(option.handle_or_link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      logger.error('payment-option-item', error);
    }
  };

  return (
    <li className={css.payment}>
      <div className={css.paymentText}>
        <p className={css.paymentLine}>
          {paymentUrl ? (
            <Button look='link' asChild>
              <a href={paymentUrl} target='_blank' rel='noopener noreferrer'>
                {name}
              </a>
            </Button>
          ) : (
            <span className={css.paymentName}>{name}</span>
          )}
          <span className={css.handle}>{option.handle_or_link}</span>
          <Button look='link' onClick={handleCopy} aria-label={`Copy ${name} handle`}>
            {isCopied ? 'Copied!' : 'Copy'}
          </Button>
          <span role='status' className={srOnly}>
            {isCopied && 'Copied!'}
          </span>
        </p>
        {option.display_name && <p className={css.paymentNote}>{option.display_name}</p>}
        {option.type === 'venmo' && option.account_last_4_digits && (
          <p className={css.paymentNote}>Verify last 4: {option.account_last_4_digits}</p>
        )}
        {option.instructions && <p className={css.paymentNote}>{option.instructions}</p>}
      </div>
      {option.qr_code_url && (
        <div className={css.paymentQr}>
          <Image src={option.qr_code_url} alt={`${name} QR code`} width={96} height={96} />
          {option.type === 'zelle' && <p className={css.paymentNote}>Scan from your bank&apos;s app</p>}
        </div>
      )}
    </li>
  );
}
