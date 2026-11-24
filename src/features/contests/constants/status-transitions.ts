import { ContestStatusType } from './status';

/**
 * Status changes an owner may make. The database enforces the same map
 * (enforce_contest_status_transition trigger).
 */
export const CONTEST_STATUS_TRANSITIONS: Record<ContestStatusType, readonly ContestStatusType[]> = {
  draft: ['open'],
  open: ['locked'],
  locked: ['open', 'in_progress'],
  in_progress: ['completed'],
  completed: [],
};

export function isAllowedStatusTransition(from: ContestStatusType, to: ContestStatusType): boolean {
  return from === to || (CONTEST_STATUS_TRANSITIONS[from]?.includes(to) ?? false);
}
