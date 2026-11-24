'use server';

import { redirect } from 'next/navigation';
import { nanoid } from 'nanoid';
import slugify from 'slugify';

import { getContestLimit } from '@/features/subscriptions/get-contest-limit';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Database } from '@/libs/supabase/types';
import { ActionResponse } from '@/types/action-response';
import { logger } from '@/utils/logger';

import { CreateContestInput, createContestSchema } from '../models/contest';

type ContestInsert = Database['public']['Tables']['contests']['Insert'];

const CONTEST_LIMIT_MESSAGE = "You've reached the limit for free accounts (1 contest). Upgrade to Pro to create more.";

/**
 * Generates a unique 6-character code for sharing contests
 */
function generateContestCode(): string {
  // Use nanoid with custom alphabet (uppercase letters + numbers, no ambiguous chars)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
}

/**
 * Generates a URL-friendly slug from the contest name
 */
function generateSlug(name: string, uniqueId: string): string {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });
  // Append a short unique id to ensure uniqueness
  return `${baseSlug}-${uniqueId}`;
}

export async function createContest(input: CreateContestInput, retryCount = 0): Promise<ActionResponse> {
  const supabase = await createSupabaseServerClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError) {
      logger.warn('createContest', 'Authentication failed', { error: authError.message });
    }
    return { data: null, error: { message: 'You must be logged in to create a contest' } };
  }

  // Validate input
  const validationResult = createContestSchema.safeParse(input);

  if (!validationResult.success) {
    return {
      data: null,
      error: {
        message: 'Invalid contest data',
        details: validationResult.error.flatten().fieldErrors,
      },
    };
  }

  const data = validationResult.data;

  // Free plan: 1 active contest. The database enforces this too.
  const { canCreate } = await getContestLimit(user.id);

  if (!canCreate) {
    return { data: null, error: { message: CONTEST_LIMIT_MESSAGE } };
  }

  // Generate unique code and slug
  const uniqueId = nanoid(6);
  const code = generateContestCode();
  const slug = generateSlug(data.name, uniqueId);

  // Insert contest into database
  const insertData: ContestInsert = {
    owner_id: user.id,
    code,
    slug,
    name: data.name,
    description: data.description || null,
    sport_type: data.sportType,
    row_team_name: data.rowTeamName,
    col_team_name: data.colTeamName,
    square_price: data.squarePrice,
    max_squares_per_person: data.maxSquaresPerPerson || null,
    // Football payouts
    payout_q1_percent: data.payoutQ1Percent,
    payout_q2_percent: data.payoutQ2Percent,
    payout_q3_percent: data.payoutQ3Percent,
    payout_final_percent: data.payoutFinalPercent,
    // Baseball payouts
    payout_game1_percent: data.payoutGame1Percent,
    payout_game2_percent: data.payoutGame2Percent,
    payout_game3_percent: data.payoutGame3Percent,
    payout_game4_percent: data.payoutGame4Percent,
    payout_game5_percent: data.payoutGame5Percent,
    payout_game6_percent: data.payoutGame6Percent,
    payout_game7_percent: data.payoutGame7Percent,
    hero_image_url: data.heroImageUrl || null,
    hero_image_position: data.heroImagePosition,
    org_image_url: data.orgImageUrl || null,
    primary_color: data.primaryColor,
    secondary_color: data.secondaryColor,
    // Prize settings
    prize_type: data.prizeType,
    // Prize text fields - only include values when prizeType is 'custom', otherwise null
    prize_q1_text: data.prizeType === 'custom' ? (data.prizeQ1Text || null) : null,
    prize_q2_text: data.prizeType === 'custom' ? (data.prizeQ2Text || null) : null,
    prize_q3_text: data.prizeType === 'custom' ? (data.prizeQ3Text || null) : null,
    prize_final_text: data.prizeType === 'custom' ? (data.prizeFinalText || null) : null,
    status: 'draft',
  };

  const { data: contest, error: insertError } = await supabase
    .from('contests')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    logger.error('createContest', insertError, {
      code: insertError.code,
      retryCount,
    });

    if (insertError.message.includes('contest_limit_reached')) {
      return { data: null, error: { message: CONTEST_LIMIT_MESSAGE } };
    }

    // Handle unique constraint violations
    if (insertError.code === '23505') {
      if (retryCount >= 3) {
        return { data: null, error: { message: 'Failed to generate unique code. Please try again.' } };
      }
      return createContest(input, retryCount + 1);
    }

    return {
      data: null,
      error: { message: 'Failed to create contest. Please try again.' },
    };
  }

  // Access PIN lives in the owner-only contest_pins table
  if (data.requirePin && data.accessPin) {
    const { error: pinError } = await supabase
      .from('contest_pins')
      .insert({ contest_id: contest.id, pin: data.accessPin });

    if (pinError) {
      logger.error('createContest', pinError, { step: 'pin' });
    }
  }

  // Redirect to the new contest's management page
  redirect(`/dashboard/${contest.id}`);
}
