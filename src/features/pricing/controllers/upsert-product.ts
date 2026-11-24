import Stripe from 'stripe';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import type { Database } from '@/libs/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

export async function upsertProduct(product: Stripe.Product) {
  const productData = toProductRow(product);

  const { error } = await supabaseAdminClient.from('products').upsert([productData]);

  if (error) {
    throw error;
  }
}

// Reads only fields that are the same in every API version from 2023-10-16 on, because webhook
// payloads arrive in the webhook endpoint's API version, not the SDK's.
export function toProductRow(product: Stripe.Product): Product {
  return {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    image: product.images?.[0] ?? null,
    metadata: product.metadata,
  };
}
