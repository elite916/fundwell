'use client';

import { useTransition } from 'react';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import { initialsOf } from '@/components/studio/grid/model';
import { Tile } from '@/components/studio/grid/tile';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/date-formatters';

import { updateSquareStatus } from '../actions/update-square-status';
import { ContestErrors, ContestStatusType, hasGameStarted } from '../constants';
import { PaymentStatus } from '../types';
import { formatPrizeAmount } from '../utils';

import css from './manage-square-modal.module.css';

export interface ManageSquare {
  id: string;
  row_index: number;
  col_index: number;
  payment_status: PaymentStatus;
  claimant_first_name: string | null;
  claimant_last_name: string | null;
  claimant_email: string | null;
  claimant_venmo: string | null;
  claimed_at: string | null;
  paid_at: string | null;
  referred_by: string | null;
}

interface ManageSquareModalProps {
  isOpen: boolean;
  onClose: () => void;
  square: ManageSquare | null;
  contestId: string;
  contestStatus: ContestStatusType;
  squarePrice: number;
  onSuccess?: () => void;
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
  available: 'Available',
  pending: 'Pending Payment',
  paid: 'Paid',
};

export function ManageSquareModal({
  isOpen,
  onClose,
  square,
  contestId,
  contestStatus,
  squarePrice,
  onSuccess,
}: ManageSquareModalProps) {
  const [isPending, startTransition] = useTransition();

  if (!square) return null;

  const handleUpdateStatus = (newStatus: PaymentStatus) => {
    startTransition(async () => {
      const result = await updateSquareStatus({
        squareId: square.id,
        contestId,
        newStatus,
      });

      if (result?.error) {
        sayProblem(result.error.message);
        return;
      }

      const messages: Record<PaymentStatus, string> = {
        available: 'Square has been released and is now available',
        pending: 'Payment status set to pending',
        paid: 'Square marked as paid',
      };

      say(messages[newStatus]);

      onSuccess?.();
      onClose();
    });
  };

  const releaseLocked = hasGameStarted(contestStatus);
  const claimantName = [square.claimant_first_name, square.claimant_last_name].filter(Boolean).join(' ');

  return (
    <DashDialog
      open={isOpen}
      onClose={onClose}
      title='Manage Square'
      description={`Row ${square.row_index + 1}, Column ${square.col_index + 1}`}
    >
      {/* Square Status */}
      <dl className={css.square}>
        <div aria-hidden='true'>
          <Tile
            payment={square.payment_status}
            className={cn(css.tile, square.payment_status === 'available' && css.open)}
          >
            {square.payment_status === 'available' ? '' : initialsOf(square)}
          </Tile>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{STATUS_LABELS[square.payment_status]}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{formatPrizeAmount(squarePrice)}</dd>
        </div>
      </dl>

      {/* Available State */}
      {square.payment_status === 'available' && (
        <>
          <p className={css.strong}>This square is available</p>
          <p className={css.soft}>No claimant information to display</p>
        </>
      )}

      {/* Claimant Info */}
      {square.payment_status !== 'available' && (
        <>
          <h3 className={css.strong}>Claimant Information</h3>
          <ul className={css.facts}>
            {claimantName && <li className={css.strong}>{claimantName}</li>}
            {square.claimant_email && (
              <li>
                <a href={`mailto:${square.claimant_email}`}>{square.claimant_email}</a>
              </li>
            )}
            {square.claimant_venmo && <li>Venmo {square.claimant_venmo}</li>}
            {square.referred_by && <li>Referred by {square.referred_by}</li>}
            {square.claimed_at && <li>Claimed {formatDateTime(square.claimed_at)}</li>}
            {square.paid_at && <li>Paid {formatDateTime(square.paid_at)}</li>}
          </ul>
        </>
      )}

      {/* Actions */}
      <DashDialogFoot stack>
        {square.payment_status === 'available' && (
          <DashButton look='quiet' onClick={onClose}>
            Close
          </DashButton>
        )}

        {square.payment_status === 'pending' && (
          <DashButton onClick={() => handleUpdateStatus('paid')} disabled={isPending}>
            Mark as Paid
          </DashButton>
        )}

        {square.payment_status === 'paid' && (
          <DashButton onClick={() => handleUpdateStatus('pending')} disabled={isPending}>
            Mark as Pending
          </DashButton>
        )}

        {square.payment_status !== 'available' && (
          <DashButton
            look='quiet'
            onClick={() => handleUpdateStatus('available')}
            disabled={isPending || releaseLocked}
            aria-describedby={releaseLocked ? 'release-locked' : undefined}
          >
            Release Square
          </DashButton>
        )}

        {releaseLocked && square.payment_status !== 'available' && (
          <p id='release-locked' className={css.why}>
            {ContestErrors.RELEASE_LOCKED}.
          </p>
        )}
      </DashDialogFoot>
    </DashDialog>
  );
}
