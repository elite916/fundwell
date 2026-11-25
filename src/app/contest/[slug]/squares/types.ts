import type { Contest } from '@/features/contests/types';

/** The contest fields the squares page uses, as `page.tsx` sends them. */
export type SquaresContest = Pick<
  Contest,
  | 'id'
  | 'status'
  | 'sport_type'
  | 'row_team_name'
  | 'col_team_name'
  | 'square_price'
  | 'max_squares_per_person'
  | 'row_numbers'
  | 'col_numbers'
  | 'payout_q1_percent'
  | 'payout_q2_percent'
  | 'payout_q3_percent'
  | 'payout_final_percent'
  | 'payout_game1_percent'
  | 'payout_game2_percent'
  | 'payout_game3_percent'
  | 'payout_game4_percent'
  | 'payout_game5_percent'
  | 'payout_game6_percent'
  | 'payout_game7_percent'
  | 'prize_type'
  | 'prize_q1_text'
  | 'prize_q2_text'
  | 'prize_q3_text'
  | 'prize_final_text'
  | 'enable_player_tracking'
  | 'players'
>;
