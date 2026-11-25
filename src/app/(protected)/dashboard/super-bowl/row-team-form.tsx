'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { say } from '@/components/studio/dashboard/dash-toast';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { srOnly } from '@/components/studio/theme';
import { setSuperBowlRowTeam } from '@/features/super-bowl/actions';
import type { SuperBowlTeam } from '@/features/super-bowl/types';

import { useAction } from './use-action';

import css from './super-bowl.module.css';
import setup from '@/components/studio/setup/setup.module.css';

interface RowTeamFormProps {
  contestId: string;
  contestName: string;
  afcTeam: string;
  nfcTeam: string;
}

/** Picked, then saved: it can't be changed later. */
export function RowTeamForm({ contestId, contestName, afcTeam, nfcTeam }: RowTeamFormProps) {
  const router = useRouter();
  const [team, setTeam] = useState<SuperBowlTeam | null>(null);
  const [isPending, run] = useAction();

  const handleSave = () => {
    if (!team) return;
    run(
      () => setSuperBowlRowTeam(contestId, team),
      () => {
        say('Settings saved');
        // This form goes away
        document.getElementById(`contest-${contestId}`)?.focus();
        router.refresh();
      }
    );
  };

  const options = [
    { value: 'afc', label: afcTeam },
    { value: 'nfc', label: nfcTeam },
  ] as const;

  return (
    <fieldset className={css.rowTeam}>
      <legend>
        Which team is on the rows?<span className={srOnly}> {contestName}</span>
      </legend>
      <div className={setup.segmented}>
        {options.map(({ value, label }) => (
          <label key={value}>
            <input
              type='radio'
              name={`row-team-${contestId}`}
              value={value}
              checked={team === value}
              onChange={() => setTeam(value)}
              className={setup.over}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <BusyButton busy={isPending} look='light' onClick={handleSave} disabled={!team}>
        Save Changes
      </BusyButton>
    </fieldset>
  );
}
