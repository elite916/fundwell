'use server';

import { redirect } from 'next/navigation';

import { getOrCreateCustomer } from '@/features/account/controllers/get-or-create-customer';
import { getUser } from '@/features/account/controllers/get-user';
import { isCheckoutablePrice } from '@/features/pricing/checkout-price';
import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getURL } from '@/utils/get-url';

export async function createCheckoutAction({ priceId }: { priceId: string }) {
  // 1. Get the user from session
  const user = await getUser();

  if (!user) {
    return redirect(`${getURL()}/signup`);
  }

  if (!user.email) {
    throw Error('Could not get email');
  }

  // 2. Look the price up on the server; never trust the client's price
  if (typeof priceId !== 'string') {
    throw Error('Invalid price');
  }

  const supabase = await createSupabaseServerClient();
  const { data: price } = await supabase
    .from('prices')
    .select('id, active, type, unit_amount, products!inner(active)')
    .eq('id', priceId)
    .maybeSingle();

  if (!price || !isCheckoutablePrice(price)) {
    throw Error('Invalid price');
  }

  // 3. A user who already has Pro can't start a second subscription. If the lookup fails, stop.
  // Same rule as hasActiveSubscription, which returns false on error.
  const { data: hasPro, error: subscriptionError } = await supabaseAdminClient.rpc('owner_has_pro', { uid: user.id });

  if (subscriptionError || typeof hasPro !== 'boolean') {
    throw Error('Could not check subscription');
  }

  if (hasPro) {
    return redirect(`${getURL()}/dashboard/billing`);
  }

  // 4. Retrieve or create the customer in Stripe
  const customer = await getOrCreateCustomer({
    userId: user.id,
    email: user.email,
  });

  // 5. Create a checkout session in Stripe
  const checkoutSession = await stripeAdmin.checkout.sessions.create({
    allowed_payment_method_types: ['card'],
    billing_address_collection: 'required',
    customer,
    customer_update: {
      address: 'auto',
    },
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    allow_promotion_codes: true,
    success_url: `${getURL()}/account`,
    cancel_url: `${getURL()}/`,
  });

  if (!checkoutSession || !checkoutSession.url) {
    throw Error('checkoutSession is not defined');
  }

  // 6. Redirect to checkout url
  redirect(checkoutSession.url);
}
