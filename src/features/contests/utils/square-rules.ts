import { ContestErrors } from '../constants/error-messages';
import { ContestStatusType, hasGameStarted, PaymentStatus, PaymentStatusType } from '../constants/status';

/**
 * Why an owner may not move squares to newStatus, or null if they may.
 * The database enforces the same rules (lock_at_kickoff migration).
 */
export function getSquareChangeRefusal(
  contestStatus: ContestStatusType,
  currentStatuses: PaymentStatusType[],
  newStatus: PaymentStatusType
): string | null {
  if (!hasGameStarted(contestStatus)) return null;

  if (newStatus === PaymentStatus.AVAILABLE) {
    return currentStatuses.some((s) => s !== PaymentStatus.AVAILABLE) ? ContestErrors.RELEASE_LOCKED : null;
  }
  return currentStatuses.includes(PaymentStatus.AVAILABLE) ? ContestErrors.ONLY_CLAIMED : null;
}

/** The same refusal when the database raised it (the game started in between). */
export function getSquareChangeRefusalFromDb(message: string): string | null {
  if (message.includes('square_release_locked')) return ContestErrors.RELEASE_LOCKED;
  if (message.includes('square_not_claimed')) return ContestErrors.ONLY_CLAIMED;
  return null;
}
