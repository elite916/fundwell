export const ContestErrors = {
  NOT_FOUND: 'Contest not found',
  UNAUTHORIZED: 'You must be logged in',
  NOT_OWNER: 'You do not own this contest',
  NOT_OPEN: 'This contest is not currently accepting claims',
  SQUARE_TAKEN: 'This square has already been claimed. Please select another.',
  SQUARE_NOT_FOUND: 'Square not found',
  FAILED_TO_CLAIM: 'Failed to claim square. Please try again.',
  RACE_CONDITION: 'This square was just claimed by someone else. Please select another.',
  SCORES_ONLY_IN_PROGRESS: 'Scores can only be entered when the contest is in progress',
  NUMBERS_REQUIRED: 'Grid numbers must be assigned before entering scores',
  INVALID_STATUS: 'Invalid status value',
  ALL_FIELDS_REQUIRED: 'All required fields must be provided',
  NO_SQUARES_SELECTED: 'No squares selected',
  FAILED_TO_UPDATE: 'Failed to update square status',
  RULES_LOCKED: "Price, payouts, prizes and max squares can't change after the game starts",
  RELEASE_LOCKED: "Claimed squares can't be released after the game starts",
  ONLY_CLAIMED: 'Only claimed squares can be marked paid or pending after the game starts',
  FAILED_TO_DELETE: 'Failed to delete',
} as const;

// Hit-a-thon (redesign-copy/hit-a-thon.md)
export const HitAThonErrors = {
  PITCHES_LOCKED: "Pitches per player can't change after hits are locked.",
  PLAYERS_REQUIRED: 'Add at least one player before opening.',
  DUPLICATE_PLAYER: 'A player with this name already exists.',
  AMOUNT_RANGE: 'Enter an amount from $1 to $10,000.',
  CAP_BELOW_AMOUNT: 'Your cap must be at least your amount per hit.',
  CAP_MAX: 'Your cap can be up to $10,000.',
  NOT_TAKING_PLEDGES: "This fundraiser isn't taking pledges right now.",
} as const;

export const PITCHES_BELOW_HITS = (name: string, hits: number): string =>
  `${name} already has ${hits} hits. Pitches can't be fewer than that.`;

export const PLAYER_HAS_PLEDGES = (name: string): string => `${name} has pledges. Cancel them first to remove ${name}.`;

export const MAX_SQUARES_REACHED = (max: number): string =>
  `You have already claimed the maximum of ${max} square(s) for this contest.`;

export const NO_SQUARES_CHANGED = (reason: string): string => `${reason}. No squares were changed.`;

export const CONTEST_LIMIT_MESSAGE =
  "You've reached the limit for free accounts (1 contest). Upgrade to Pro to create more.";
