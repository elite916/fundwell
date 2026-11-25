'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

import { say } from '@/components/studio/dashboard/dash-toast';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { TextField } from '@/components/studio/text-field';
import { saveSuperBowlTeams } from '@/features/super-bowl/actions';
import type { SuperBowlGame } from '@/features/super-bowl/types';

import { useAction } from './use-action';

import css from './super-bowl.module.css';
import setup from '@/components/studio/setup/setup.module.css';

export function TeamsForm({ game }: { game: SuperBowlGame | null }) {
  const router = useRouter();
  const [isPending, run] = useAction();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    run(
      () => saveSuperBowlTeams(String(data.get('afc')), String(data.get('nfc'))),
      () => {
        say('Settings saved');
        router.refresh();
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className={css.form}>
      {/* The key shows the names as they were saved */}
      <div key={`${game?.afc_team}|${game?.nfc_team}`} className={setup.two}>
        <TextField label='AFC team' name='afc' defaultValue={game?.afc_team} autoComplete='off' />
        <TextField label='NFC team' name='nfc' defaultValue={game?.nfc_team} autoComplete='off' />
      </div>
      <BusyButton busy={isPending} type='submit' look='quiet'>
        Save Teams
      </BusyButton>
    </form>
  );
}
