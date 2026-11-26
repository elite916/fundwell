'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { DashButton, DashCheckbox, DashInput } from '@/components/studio/dashboard/dash-button';
import { Tag } from '@/components/studio/dashboard/dash-page';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import { srOnly } from '@/components/studio/theme';
import { bulkUpdateSquares } from '@/features/contests/actions/bulk-update-squares';
import { ManageSquare, ManageSquareModal } from '@/features/contests/components/manage-square-modal';
import { ContestStatusType } from '@/features/contests/constants';
import { Participant } from '@/features/contests/queries/get-participants';
import { PaymentStatus } from '@/features/contests/types';
import { cn } from '@/utils/cn';
import { escapeCsvCell } from '@/utils/csv';

import css from '../table.module.css';

type FilterStatus = 'all' | 'pending' | 'paid';

interface ParticipantsTableClientProps {
  participants: Participant[];
  contestId: string;
  contestStatus: ContestStatusType;
  contestName: string;
  squarePrice: number;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateISO(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
}

function formatName(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return name || '—';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function ParticipantsTableClient({
  participants,
  contestId,
  contestStatus,
  contestName,
  squarePrice,
}: ParticipantsTableClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedSquare, setSelectedSquare] = useState<ManageSquare | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const endFocusRef = useRef<HTMLElement | null>(null);

  // Filter participants based on search and status
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Status filter
      if (filterStatus !== 'all' && p.payment_status !== filterStatus) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = formatName(p.claimant_first_name, p.claimant_last_name).toLowerCase();
        const email = (p.claimant_email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      }

      return true;
    });
  }, [participants, searchQuery, filterStatus]);

  // Calculate counts for filter tabs
  const counts = useMemo(() => {
    return {
      all: participants.length,
      pending: participants.filter((p) => p.payment_status === 'pending').length,
      paid: participants.filter((p) => p.payment_status === 'paid').length,
    };
  }, [participants]);

  // Check if all filtered participants are selected
  const allSelected = filteredParticipants.length > 0 && filteredParticipants.every((p) => selectedIds.has(p.id));
  // A square released somewhere else may still be in `selectedIds`
  const selectedSquareIds = participants.filter((p) => selectedIds.has(p.id)).map((p) => p.id);
  const someSelected = selectedSquareIds.length > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered
      const newSelected = new Set(selectedIds);
      filteredParticipants.forEach((p) => newSelected.delete(p.id));
      setSelectedIds(newSelected);
    } else {
      // Select all filtered
      const newSelected = new Set(selectedIds);
      filteredParticipants.forEach((p) => newSelected.add(p.id));
      setSelectedIds(newSelected);
    }
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
      const result = await bulkUpdateSquares({
        contestId,
        squareIds: selectedSquareIds,
        newStatus: 'paid',
      });

      if (result?.error) {
        sayProblem(result.error.message);
        return;
      }

      say(`${result?.data?.updated ?? 0} participant(s) marked as paid`);

      handleClearSelection();
      router.refresh();
    });
  };

  const handleRowClick = (participant: Participant) => {
    endFocusRef.current = null;
    setSelectedSquare(participant as ManageSquare);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSquare(null);
  };

  const handleSuccess = (newStatus: PaymentStatus) => {
    const square = selectedSquare;

    if (square && newStatus === 'available') {
      setSelectedIds((ids) => new Set([...ids].filter((id) => id !== square.id)));
    }

    // The square's row goes away: focus goes to the next one, or the one before it
    if (square && (newStatus === 'available' || filterStatus !== 'all')) {
      const index = filteredParticipants.findIndex((p) => p.id === square.id);
      const near = filteredParticipants[index + 1] ?? filteredParticipants[index - 1];
      endFocusRef.current = near ? document.getElementById(`manage-${near.id}`) : selectAllRef.current;
    }

    router.refresh();
  };

  const handleExportCSV = () => {
    const headers = ['Square Position', 'Name', 'Email', 'Venmo', 'Status', 'Claimed Date', 'Paid Date'];
    const rows = filteredParticipants.map((p) => [
      `Row ${p.row_index + 1} Col ${p.col_index + 1}`,
      formatName(p.claimant_first_name, p.claimant_last_name),
      p.claimant_email || '',
      p.claimant_venmo || '',
      p.payment_status,
      formatDateISO(p.claimed_at),
      formatDateISO(p.paid_at),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `${slugify(contestName)}-participants-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filters = [
    { status: 'all', label: `All (${counts.all})` },
    { status: 'pending', label: `Pending (${counts.pending})` },
    { status: 'paid', label: `Paid (${counts.paid})` },
  ] as const;

  return (
    <>
      {/* Bulk Action Bar */}
      {someSelected && (
        <div role='region' aria-label='Selected' className={css.bulk}>
          <span aria-live='polite'>{selectedSquareIds.length} selected</span>
          <DashButton onClick={handleBulkMarkAsPaid} disabled={isPending}>
            Mark as Paid
          </DashButton>
          <DashButton look='light' onClick={handleClearSelection} disabled={isPending}>
            Clear Selection
          </DashButton>
        </div>
      )}

      {/* Controls Row */}
      <div className={css.tools}>
        <DashInput
          type='search'
          aria-label='Search by name or email'
          placeholder='Search by name or email...'
          autoComplete='off'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <DashButton look='quiet' onClick={handleExportCSV}>
          Export CSV
        </DashButton>
      </div>

      {/* Filter Tabs */}
      <div role='group' aria-label='Status' className={css.filters}>
        {filters.map(({ status, label }) => (
          <DashButton
            key={status}
            look='quiet'
            aria-pressed={filterStatus === status}
            onClick={() => setFilterStatus(status)}
          >
            {label}
          </DashButton>
        ))}
      </div>

      {/* Table. The roles keep it a table where narrow screens lay it out another way. */}
      <table role='table' className={cn(css.table, css.people)}>
        <caption className={srOnly}>Participants</caption>
        <thead role='rowgroup'>
          <tr role='row'>
            <th role='columnheader' scope='col'>
              <label className={css.check}>
                <span className={srOnly}>Select all</span>
                <DashCheckbox ref={selectAllRef} checked={allSelected} onChange={handleSelectAll} />
              </label>
            </th>
            {['Square', 'Name', 'Email', 'Venmo', 'Status', 'Claimed', 'Actions'].map((heading) => (
              <th key={heading} role='columnheader' scope='col'>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role='rowgroup'>
          {filteredParticipants.length === 0 ? (
            <tr role='row' className={css.blank}>
              <td role='cell' colSpan={8}>
                {searchQuery || filterStatus !== 'all' ? 'No participants match your filters.' : 'No participants yet.'}
              </td>
            </tr>
          ) : (
            filteredParticipants.map((participant) => {
              const name = formatName(participant.claimant_first_name, participant.claimant_last_name);
              const square = `Row ${participant.row_index + 1}, Col ${participant.col_index + 1}`;
              const spoken = `${name}, Row ${participant.row_index + 1}, Column ${participant.col_index + 1}`;
              return (
                <tr
                  key={participant.id}
                  role='row'
                  data-on={selectedIds.has(participant.id) || undefined}
                  onClick={(e) => {
                    // A press anywhere on the row opens it, except on the row's own controls
                    if ((e.target as HTMLElement).closest('a, button, label')) return;
                    e.currentTarget.querySelector('button')?.focus({ preventScroll: true });
                    handleRowClick(participant);
                  }}
                >
                  <td role='cell' className={css.tick}>
                    <label className={css.check}>
                      <span className={srOnly}>Select {spoken}</span>
                      <DashCheckbox
                        checked={selectedIds.has(participant.id)}
                        onChange={() => handleSelectOne(participant.id)}
                      />
                    </label>
                  </td>
                  <td role='cell' className={css.square}>
                    {square}
                  </td>
                  <td role='cell' className={css.name}>
                    {name}
                  </td>
                  <td role='cell' className={css.email}>
                    {participant.claimant_email ? (
                      <a href={`mailto:${participant.claimant_email}`}>{participant.claimant_email}</a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td role='cell' className={css.venmo}>
                    <span className={css.lead}>Venmo </span>
                    {participant.claimant_venmo || '—'}
                  </td>
                  <td role='cell' className={css.status}>
                    {participant.payment_status === 'pending' ? <Tag tone='owes'>Pending</Tag> : <Tag>Paid</Tag>}
                  </td>
                  <td role='cell' className={css.date}>
                    <span className={css.lead}>Claimed </span>
                    {formatDate(participant.claimed_at)}
                  </td>
                  <td role='cell' className={css.go}>
                    <DashButton look='link' id={`manage-${participant.id}`} onClick={() => handleRowClick(participant)}>
                      Manage<span className={srOnly}> {spoken}</span>
                    </DashButton>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Manage Square Modal */}
      <ManageSquareModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        square={selectedSquare}
        contestId={contestId}
        contestStatus={contestStatus}
        squarePrice={squarePrice}
        onSuccess={handleSuccess}
        endFocus={() => endFocusRef.current}
      />
    </>
  );
}
