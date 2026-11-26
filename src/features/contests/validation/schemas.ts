import { z } from 'zod';

import { HitAThonErrors } from '@/features/contests/constants/error-messages';

export const claimSquareSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }).max(50, { message: 'First name is too long' }),
  lastName: z.string().min(1, { message: 'Last name is required' }).max(50, { message: 'Last name is too long' }),
  email: z.email({ message: 'Please enter a valid email' }),
  venmoHandle: z.string().max(32, { message: 'Handle is too long' }).optional(),
  referredBySlug: z.string().max(50).optional(),
});

export type ClaimSquareFormData = z.infer<typeof claimSquareSchema>;

// Hit-a-thon pledges (redesign-copy/hit-a-thon.md). The database's rules: $1 to $10,000, a cap per hit only, and at
// least the amount.
const inCents = (amount: number) => Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6;
const pledgeAmount = z
  .number({ error: HitAThonErrors.AMOUNT_RANGE })
  .min(1, { error: HitAThonErrors.AMOUNT_RANGE })
  .max(10000, { error: HitAThonErrors.AMOUNT_RANGE })
  .refine(inCents, { error: HitAThonErrors.AMOUNT_RANGE });
// Below the amount is checked with the amount, below.
const pledgeCap = z
  .number({ error: HitAThonErrors.AMOUNT_RANGE })
  .max(10000, { error: HitAThonErrors.CAP_MAX })
  .refine(inCents, { error: HitAThonErrors.AMOUNT_RANGE });

export const pledgeSchema = z
  .object({
    kind: z.enum(['per_hit', 'flat']),
    amount: pledgeAmount,
    cap: pledgeCap.optional(),
    firstName: claimSquareSchema.shape.firstName,
    lastName: claimSquareSchema.shape.lastName,
    email: claimSquareSchema.shape.email,
  })
  .refine(({ kind, amount, cap }) => kind !== 'per_hit' || cap === undefined || cap >= amount, {
    path: ['cap'],
    error: HitAThonErrors.CAP_BELOW_AMOUNT,
  });

export type PledgeFormData = z.infer<typeof pledgeSchema>;
