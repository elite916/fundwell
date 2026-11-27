'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

import { Button } from '@/components/studio/button';
import { srOnly } from '@/components/studio/theme';
import type { PaymentOption, PaymentOptionType } from '@/features/contests/types';
import { copyText, selectText } from '@/utils/copy-text';
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
  const handleRef = useRef<HTMLParagraphElement>(null);
  const name = NAMES[option.type];
  const paymentUrl = generatePaymentUrl(option.type, option.handle_or_link);

  const handleCopy = async () => {
    if (await copyText(option.handle_or_link)) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      // Ready to copy by hand
      selectText(handleRef.current);
    }
  };

  return (
    <li className={css.payment}>
      <div className={css.paymentText}>
        <p className={css.paymentName}>
          {paymentUrl ? (
            <a href={paymentUrl} target='_blank' rel='noopener noreferrer'>
              {name}
            </a>
          ) : (
            name
          )}
        </p>
        <p ref={handleRef} className={css.handle}>
          {option.handle_or_link}
        </p>
        {option.display_name && <p className={css.paymentNote}>{option.display_name}</p>}
        {option.type === 'venmo' && option.account_last_4_digits && (
          <p className={css.paymentNote}>Verify last 4: {option.account_last_4_digits}</p>
        )}
        {option.instructions && <p className={css.paymentNote}>{option.instructions}</p>}
      </div>
      <Button look='ghost' onClick={handleCopy} aria-label={isCopied ? undefined : `Copy ${name} handle`}>
        {isCopied ? 'Copied!' : 'Copy'}
      </Button>
      <span role='status' className={srOnly}>
        {isCopied && 'Copied!'}
      </span>
      {option.qr_code_url && (
        <div className={css.paymentQr}>
          <Image src={option.qr_code_url} alt={`${name} QR code`} width={96} height={96} />
          {option.type === 'zelle' && <p className={css.paymentNote}>Scan from your bank&apos;s app</p>}
        </div>
      )}
    </li>
  );
}
