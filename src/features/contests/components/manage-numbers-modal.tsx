'use client';

import { useId, useState, useTransition } from 'react';

import { DashButton, DashCheckbox, DashInput } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { Note } from '@/components/studio/dashboard/dash-page';
import { say, sayProblem } from '@/components/studio/dashboard/dash-toast';
import * as Tabs from '@radix-ui/react-tabs';

import { assignGridNumbers } from '../actions/assign-grid-numbers';

import css from './manage-numbers-modal.module.css';

interface Contest {
  id: string;
  status: string;
  row_numbers: number[] | null;
  col_numbers: number[] | null;
  numbers_auto_generated: boolean | null;
  row_team_name: string | null;
  col_team_name: string | null;
}

interface ManageNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest;
  onSuccess?: () => void;
}

/**
 * Mini grid preview showing row and column numbers
 */
function GridPreview({
  rowNumbers,
  colNumbers,
  rowTeamName,
  colTeamName,
}: {
  rowNumbers: number[];
  colNumbers: number[];
  rowTeamName: string | null;
  colTeamName: string | null;
}) {
  return (
    <div className={css.preview}>
      <h3>Preview</h3>
      <div aria-hidden='true' className={css.grid}>
        <div className={css.across}>{colTeamName || 'Column Team'}</div>
        {colNumbers.map((num, idx) => (
          <b key={idx} style={{ gridColumn: idx + 3 }}>
            {num}
          </b>
        ))}
        <div className={css.down}>{rowTeamName || 'Row Team'}</div>
        {rowNumbers.map((num, idx) => (
          <i key={idx} style={{ gridRow: idx + 3 }}>
            {num}
          </i>
        ))}
        <div className={css.bed}>10x10 Grid</div>
      </div>
    </div>
  );
}

/**
 * Read-only display of current numbers
 */
function NumbersDisplay({ label, numbers }: { label: string; numbers: number[] }) {
  return (
    <div>
      <p className={css.label}>{label}</p>
      <div className={css.digits}>
        {numbers.map((num, idx) => (
          <span key={idx}>{num}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Ten inputs for one team's numbers
 */
function NumbersInput({
  label,
  numbers,
  error,
  onChange,
}: {
  label: string;
  numbers: (number | null)[];
  error: string | null;
  onChange: (index: number, value: string) => void;
}) {
  const id = useId();

  return (
    <div role='group' aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className={css.label}>
        {label}
      </p>
      <div className={css.digits}>
        {numbers.map((num, idx) => (
          <DashInput
            key={idx}
            type='text'
            inputMode='numeric'
            maxLength={1}
            autoComplete='off'
            aria-label={`${label}, position ${idx + 1}`}
            aria-invalid={(error && (num === null || numbers.indexOf(num) !== idx)) || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            value={num ?? ''}
            onChange={(e) => onChange(idx, e.target.value)}
            className={css.digit}
            placeholder={String(idx)}
          />
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} role='alert' className={css.error}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Validates that an array contains exactly the digits 0-9 with no duplicates
 */
function validateNumbers(arr: (number | null)[]): { valid: boolean; error?: string } {
  const filtered = arr.filter((n): n is number => n !== null);

  if (filtered.length !== 10) {
    return { valid: false, error: 'All 10 numbers are required' };
  }

  const unique = new Set(filtered);
  if (unique.size !== 10) {
    return { valid: false, error: 'Each number must be unique (no duplicates)' };
  }

  const hasInvalid = filtered.some((n) => n < 0 || n > 9);
  if (hasInvalid) {
    return { valid: false, error: 'Numbers must be between 0 and 9' };
  }

  return { valid: true };
}

export function ManageNumbersModal({ isOpen, onClose, contest, onSuccess }: ManageNumbersModalProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  const [isPending, startTransition] = useTransition();

  // Manual entry state
  const [rowInputs, setRowInputs] = useState<(number | null)[]>(contest.row_numbers ?? Array(10).fill(null));
  const [colInputs, setColInputs] = useState<(number | null)[]>(contest.col_numbers ?? Array(10).fill(null));
  const [rowError, setRowError] = useState<string | null>(null);
  const [colError, setColError] = useState<string | null>(null);
  const [emailPlayers, setEmailPlayers] = useState(false);

  // Preview state (for auto-generate preview before saving)
  const [previewNumbers, setPreviewNumbers] = useState<{
    row: number[];
    col: number[];
  } | null>(contest.row_numbers && contest.col_numbers ? { row: contest.row_numbers, col: contest.col_numbers } : null);

  const isLocked = contest.status === 'in_progress' || contest.status === 'completed';
  const hasExistingNumbers = contest.row_numbers !== null && contest.col_numbers !== null;

  const handleClose = () => {
    // Reset state when closing
    setRowInputs(contest.row_numbers ?? Array(10).fill(null));
    setColInputs(contest.col_numbers ?? Array(10).fill(null));
    setRowError(null);
    setColError(null);
    setEmailPlayers(false);
    setPreviewNumbers(
      contest.row_numbers && contest.col_numbers ? { row: contest.row_numbers, col: contest.col_numbers } : null
    );
    onClose();
  };

  const handleInputChange = (type: 'row' | 'col', index: number, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);

    // Validate single digit
    if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > 9)) {
      return;
    }

    if (type === 'row') {
      const newInputs = [...rowInputs];
      newInputs[index] = numValue;
      setRowInputs(newInputs);
      setRowError(null);

      // Update preview if we have valid numbers
      const validation = validateNumbers(newInputs);
      if (validation.valid && colInputs.every((n) => n !== null)) {
        setPreviewNumbers({ row: newInputs as number[], col: colInputs as number[] });
      }
    } else {
      const newInputs = [...colInputs];
      newInputs[index] = numValue;
      setColInputs(newInputs);
      setColError(null);

      // Update preview if we have valid numbers
      const validation = validateNumbers(newInputs);
      if (validation.valid && rowInputs.every((n) => n !== null)) {
        setPreviewNumbers({ row: rowInputs as number[], col: newInputs as number[] });
      }
    }
  };

  const handleAutoGenerate = () => {
    startTransition(async () => {
      const result = await assignGridNumbers({
        contestId: contest.id,
        rowNumbers: null,
        colNumbers: null,
        autoGenerate: true,
        emailPlayers,
      });

      if (result?.error) {
        sayProblem(result.error.message);
        return;
      }

      if (result?.data) {
        setPreviewNumbers({
          row: result.data.rowNumbers,
          col: result.data.colNumbers,
        });

        say('Grid numbers have been randomly generated.');

        onSuccess?.();
      }
    });
  };

  const handleManualSave = () => {
    // Validate inputs
    const rowValidation = validateNumbers(rowInputs);
    const colValidation = validateNumbers(colInputs);

    if (!rowValidation.valid || !colValidation.valid) {
      setRowError(rowValidation.valid ? null : (rowValidation.error ?? 'Invalid row numbers'));
      setColError(colValidation.valid ? null : (colValidation.error ?? 'Invalid column numbers'));
      return;
    }

    startTransition(async () => {
      const result = await assignGridNumbers({
        contestId: contest.id,
        rowNumbers: rowInputs as number[],
        colNumbers: colInputs as number[],
        autoGenerate: false,
        emailPlayers,
      });

      if (result?.error) {
        sayProblem(result.error.message);
        return;
      }

      if (result?.data) {
        setPreviewNumbers({
          row: result.data.rowNumbers,
          col: result.data.colNumbers,
        });

        say('Grid numbers have been saved.');

        onSuccess?.();
      }
    });
  };

  return (
    <DashDialog
      open={isOpen}
      onClose={handleClose}
      size='mid'
      title='Manage Grid Numbers'
      description='Assign numbers 0-9 to each row and column of the grid.'
    >
      {isLocked ? (
        <>
          {/* Locked state - read only */}
          <Note tone='warn'>Numbers cannot be changed after the game has started.</Note>

          {hasExistingNumbers && (
            <>
              <NumbersDisplay label={contest.row_team_name ?? 'Row Numbers'} numbers={contest.row_numbers!} />
              <NumbersDisplay label={contest.col_team_name ?? 'Column Numbers'} numbers={contest.col_numbers!} />
            </>
          )}

          <DashDialogFoot>
            <DashButton onClick={handleClose}>Close</DashButton>
          </DashDialogFoot>
        </>
      ) : (
        <>
          {/* Warning if numbers exist */}
          {hasExistingNumbers && <Note tone='warn'>This will replace the current numbers.</Note>}

          {hasExistingNumbers && (
            <label className={css.email}>
              <DashCheckbox checked={emailPlayers} onChange={(e) => setEmailPlayers(e.target.checked)} />
              Email players their new numbers
            </label>
          )}

          <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as 'auto' | 'manual')}>
            <Tabs.List aria-label='Manage Grid Numbers' className={css.tabs}>
              <Tabs.Trigger value='auto'>Auto-Generate</Tabs.Trigger>
              <Tabs.Trigger value='manual'>Manual Entry</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value='auto' className={css.panel}>
              <p className={css.how}>
                Randomly assign numbers 0-9 to each row and column. The order will be shuffled for fairness.
              </p>

              <DashButton onClick={handleAutoGenerate} disabled={isPending}>
                {isPending ? 'Generating...' : 'Generate Random Numbers'}
              </DashButton>
            </Tabs.Content>

            <Tabs.Content value='manual' className={css.panel}>
              <p className={css.how}>
                Enter your own number order for each axis. Each number 0-9 must appear exactly once.
              </p>

              <NumbersInput
                label={`${contest.row_team_name ?? 'Row'} Numbers`}
                numbers={rowInputs}
                error={rowError}
                onChange={(index, value) => handleInputChange('row', index, value)}
              />
              <NumbersInput
                label={`${contest.col_team_name ?? 'Column'} Numbers`}
                numbers={colInputs}
                error={colError}
                onChange={(index, value) => handleInputChange('col', index, value)}
              />

              <DashButton onClick={handleManualSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Numbers'}
              </DashButton>
            </Tabs.Content>
          </Tabs.Root>

          {/* Preview section */}
          {previewNumbers && (
            <GridPreview
              rowNumbers={previewNumbers.row}
              colNumbers={previewNumbers.col}
              rowTeamName={contest.row_team_name}
              colTeamName={contest.col_team_name}
            />
          )}

          <DashDialogFoot>
            <DashButton look='quiet' onClick={handleClose}>
              Close
            </DashButton>
          </DashDialogFoot>
        </>
      )}
    </DashDialog>
  );
}
