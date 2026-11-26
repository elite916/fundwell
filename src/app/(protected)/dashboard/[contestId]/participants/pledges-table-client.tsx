'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { DashButton, DashCheckbox } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { Tag } from '@/components/studio/dashboard/dash-page';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { srOnly } from '@/components/studio/theme';
import { bulkMarkPledgesPaid, updatePledgeStatus } from '@/features/contests/actions/pledges';
import { emailUnpaidSupporters } from '@/features/contests/actions/send-totals';
import type { HitPlayerWithHits, OwnerPledge } from '@/features/contests/queries/get-pledges';
import { formatPrizeAmount } from '@/features/contests/utils';
import { pledgeLabel, pledgeTotal } from '@/features/contests/utils/pledges';
import { cn } from '@/utils/cn';

import css from '../table.module.css';

interface PledgesTableClientProps {
  contestId: string;
  pitches: number;
  players: HitPlayerWithHits[];
  /** Cancelled pledges left out, like released squares. */
  pledges: OwnerPledge[];
  /** Hits are locked: the totals have gone out, so reminders can. */
  isLocked: boolean;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatName(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return name || '—';
}

const STATUS_TAGS: Record<OwnerPledge['status'], { label: string; tone?: 'owes' }> = {
  pledged: { label: 'Pledged' },
  pending: { label: 'Pending', tone: 'owes' },
  paid: { label: 'Paid' },
  nothing_owed: { label: 'Nothing owed' },
  cancelled: { label: '' },
};

/** A hit-a-thon's pledges: the squares Participants table's counterpart. Marking one paid emails the supporter. */
export function PledgesTableClient({ contestId, pitches, players, pledges, isLocked }: PledgesTableClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState<OwnerPledge | null>(null);
  const [isReminding, setIsReminding] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const endFocusRef = useRef<HTMLElement | null>(null);

  const playersById = new Map(players.map((p) => [p.id, p]));
  const playerName = (pledge: OwnerPledge) => {
    const player = playersById.get(pledge.player_id);
    if (!player) return '—';
    return player.number !== null ? `${player.first_name} #${player.number}` : player.first_name;
  };
  const spoken = (pledge: OwnerPledge) => `${formatName(pledge.first_name, pledge.last_name)}, ${playerName(pledge)}`;

  const allSelected = pledges.length > 0 && pledges.every((p) => selectedIds.has(p.id));
  // A pledge cancelled somewhere else may still be in `selectedIds`
  const selectedPledgeIds = pledges.filter((p) => selectedIds.has(p.id)).map((p) => p.id);
  const someSelected = selectedPledgeIds.length > 0;

  const handleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(pledges.map((p) => p.id)));
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    // The bar with the pressed button goes away
    selectAllRef.current?.focus({ preventScroll: true });
  };

  const handleBulkMarkAsPaid = () => {
    startTransition(async () => {
      const result = await bulkMarkPledgesPaid(contestId, selectedPledgeIds);

      if (!result || result.error) {
        sayProblem(result?.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }

      say(`${result.data?.updated ?? 0} pledge(s) marked as paid`);
      handleClearSelection();
      router.refresh();
    });
  };

  const handleMark = (pledge: OwnerPledge, newStatus: 'paid' | 'pending') => {
    startTransition(async () => {
      const result = await updatePledgeStatus(contestId, pledge.id, newStatus);

      if (!result || result.error) {
        sayProblem(result?.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }

      say(newStatus === 'paid' ? 'Pledge marked as paid' : 'Payment status set to pending');
      router.refresh();
    });
  };

  const openCancel = (pledge: OwnerPledge) => {
    endFocusRef.current = null;
    setCancelling(pledge);
  };

  const confirmCancel = () => {
    const pledge = cancelling;
    if (!pledge) return;

    startTransition(async () => {
      const result = await updatePledgeStatus(contestId, pledge.id, 'cancelled');

      if (!result || result.error) {
        sayProblem(result?.error?.message ?? 'Something went wrong. Please try again.');
        setCancelling(null);
        return;
      }

      // The pledge's row goes away: focus goes to the next one, or the one before it
      const index = pledges.findIndex((p) => p.id === pledge.id);
      const near = pledges[index + 1] ?? pledges[index - 1];
      endFocusRef.current = (near && document.getElementById(`cancel-${near.id}`)) || selectAllRef.current;
      setSelectedIds((ids) => new Set([...ids].filter((id) => id !== pledge.id)));

      say('Pledge cancelled');
      setCancelling(null);
      router.refresh();
    });
  };

  const unpaid = pledges.filter((p) => p.status === 'pending').length;

  const confirmReminders = () => {
    startTransition(async () => {
      const result = await emailUnpaidSupporters(contestId);

      if (!result || result.error) {
        sayProblem(result?.error?.message ?? 'Something went wrong. Please try again.');
        setIsReminding(false);
        return;
      }

      say('Reminders sent');
      setIsReminding(false);
    });
  };

  // What the player's total drops by: this pledge's part of the overview's "Total"
  const cancellingPlayer = cancelling ? playersById.get(cancelling.player_id) : undefined;
  const cancellingDrop = cancelling ? pledgeTotal(cancelling, cancellingPlayer?.hits ?? null, pitches) : 0;

  return (
    <>
      {/* Bulk Action Bar */}
      {someSelected && (
        <div role='region' aria-label='Selected' className={css.bulk}>
          <span aria-live='polite'>{selectedPledgeIds.length} selected</span>
          <DashButton onClick={handleBulkMarkAsPaid} disabled={isPending}>
            Mark as Paid
          </DashButton>
          <DashButton look='light' onClick={handleClearSelection} disabled={isPending}>
            Clear Selection
          </DashButton>
        </div>
      )}

      {isLocked && unpaid > 0 && (
        <DashButton look='quiet' onClick={() => setIsReminding(true)} disabled={isPending} className={css.remind}>
          Email Unpaid Supporters
        </DashButton>
      )}

      {pledges.length === 0 && <p className={css.empty}>No pledges yet.</p>}

      {/* Table. The roles keep it a table where narrow screens lay it out another way. */}
      {pledges.length > 0 && (
        <table role='table' className={cn(css.table, css.pledges)}>
          <caption className={srOnly}>Pledges</caption>
          <thead role='rowgroup'>
            <tr role='row'>
              <th role='columnheader' scope='col'>
                <label className={css.check}>
                  <span className={srOnly}>Select all</span>
                  <DashCheckbox ref={selectAllRef} checked={allSelected} onChange={handleSelectAll} />
                </label>
              </th>
              {['Player', 'Supporter', 'Email', 'Pledge', 'Owed', 'Status', 'Pledged', 'Actions'].map((heading) => (
                <th key={heading} role='columnheader' scope='col'>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role='rowgroup'>
            {pledges.map((pledge) => {
              const tag = STATUS_TAGS[pledge.status];
              return (
                <tr key={pledge.id} role='row' data-on={selectedIds.has(pledge.id) || undefined}>
                  <td role='cell' className={css.tick}>
                    <label className={css.check}>
                      <span className={srOnly}>Select {spoken(pledge)}</span>
                      <DashCheckbox checked={selectedIds.has(pledge.id)} onChange={() => handleSelectOne(pledge.id)} />
                    </label>
                  </td>
                  <td role='cell' className={css.player}>
                    {playerName(pledge)}
                  </td>
                  <td role='cell' className={css.name}>
                    {formatName(pledge.first_name, pledge.last_name)}
                  </td>
                  <td role='cell' className={css.email}>
                    {pledge.email ? <a href={`mailto:${pledge.email}`}>{pledge.email}</a> : '—'}
                  </td>
                  <td role='cell' className={css.pledge}>
                    {pledgeLabel(pledge)}
                  </td>
                  <td role='cell' className={css.owed}>
                    <span className={css.lead}>Owed </span>
                    {pledge.amount_owed !== null ? formatPrizeAmount(Number(pledge.amount_owed)) : '—'}
                  </td>
                  <td role='cell' className={css.status}>
                    <Tag tone={tag.tone}>{tag.label}</Tag>
                  </td>
                  <td role='cell' className={css.date}>
                    <span className={css.lead}>Pledged </span>
                    {formatDate(pledge.created_at)}
                  </td>
                  <td role='cell' className={css.acts}>
                    <div>
                      {pledge.status === 'pending' && (
                        <DashButton look='link' onClick={() => handleMark(pledge, 'paid')} disabled={isPending}>
                          Mark as Paid<span className={srOnly}> {spoken(pledge)}</span>
                        </DashButton>
                      )}
                      {pledge.status === 'paid' && (
                        <DashButton look='link' onClick={() => handleMark(pledge, 'pending')} disabled={isPending}>
                          Mark as Pending<span className={srOnly}> {spoken(pledge)}</span>
                        </DashButton>
                      )}
                      {(pledge.status === 'pledged' || pledge.status === 'pending') && (
                        <DashButton look='link' id={`cancel-${pledge.id}`} onClick={() => openCancel(pledge)}>
                          Cancel Pledge<span className={srOnly}> {spoken(pledge)}</span>
                        </DashButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <DashDialog
        open={isReminding}
        onClose={() => !isPending && setIsReminding(false)}
        title={unpaid === 1 ? 'Email 1 supporter who still owes?' : `Email ${unpaid} supporters who still owe?`}
        description="They'll get their total and your payment options again."
      >
        <DashDialogFoot>
          <DashButton look='quiet' onClick={() => setIsReminding(false)} disabled={isPending}>
            Cancel
          </DashButton>
          <BusyButton busy={isPending} onClick={confirmReminders}>
            Send
          </BusyButton>
        </DashDialogFoot>
      </DashDialog>

      <DashDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title='Cancel this pledge?'
        description={
          cancellingPlayer
            ? `${cancellingPlayer.first_name}'s total drops by ${formatPrizeAmount(cancellingDrop)}. The supporter isn't emailed.`
            : undefined
        }
        endFocus={() => endFocusRef.current}
      >
        <DashDialogFoot>
          <DashButton look='quiet' onClick={() => setCancelling(null)} disabled={isPending}>
            Keep Pledge
          </DashButton>
          <BusyButton busy={isPending} onClick={confirmCancel}>
            Cancel Pledge
          </BusyButton>
        </DashDialogFoot>
      </DashDialog>
    </>
  );
}
