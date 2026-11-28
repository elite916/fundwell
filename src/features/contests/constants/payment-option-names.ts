import type { PaymentOptionType } from '@/features/contests/types';

/** The app name for each way to pay, as people know it: "Venmo", not the stored "venmo". */
export const PAYMENT_OPTION_NAMES: Record<PaymentOptionType, string> = {
  venmo: 'Venmo',
  paypal: 'PayPal',
  cashapp: 'Cash App',
  zelle: 'Zelle',
};
