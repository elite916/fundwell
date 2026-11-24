'use server';

import type { ActionResponse } from '@/types/action-response';

import { withContestOwnership } from '../middleware/auth-middleware';

const PIN_PATTERN = /^[A-Za-z0-9]{1,6}$/;

/**
 * Sets or removes a contest's access PIN. Only the owner can change it.
 * PINs live in contest_pins (owner-only), not on the public contests row.
 */
export async function updateContestPin(contestId: string, pin: string | null): Promise<ActionResponse<{ id: string }>> {
  return withContestOwnership<{ id: string }>(contestId, async (user, supabase) => {
    const trimmed = pin?.trim() ?? '';

    if (!trimmed) {
      const { error } = await supabase.from('contest_pins').delete().eq('contest_id', contestId);
      if (error) throw new Error('Failed to update PIN');
      return { id: contestId };
    }

    if (!PIN_PATTERN.test(trimmed)) {
      throw new Error('PIN must be 1-6 letters or numbers');
    }

    const { error } = await supabase
      .from('contest_pins')
      .upsert({ contest_id: contestId, pin: trimmed, updated_at: new Date().toISOString() }, { onConflict: 'contest_id' });

    if (error) throw new Error('Failed to update PIN');

    return { id: contestId };
  })();
}
