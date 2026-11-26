'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { DashButton, DashInput, IconButton } from '@/components/studio/dashboard/dash-button';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { SetupSection } from '@/components/studio/setup/section';
import { srOnly } from '@/components/studio/theme';
import { useToast } from '@/components/ui/use-toast';
import { addHitPlayer, removeHitPlayer } from '@/features/contests/actions/hit-players';
import { HitAThonErrors } from '@/features/contests/constants';
import { type HitPlayer, sortHitPlayers } from '@/features/contests/utils/hit-players';
import { Database } from '@/libs/supabase/types';
import { copyText } from '@/utils/copy-text';
import { getURL } from '@/utils/get-url';

import css from '@/components/studio/setup/setup.module.css';

type Contest = Database['public']['Tables']['contests']['Row'];

interface HitPlayersSectionProps {
  contest: Contest;
  players: HitPlayer[];
}

/** A hit-a-thon's players: always on, unlike squares' player tracking. */
export function HitPlayersSection({ contest, players }: HitPlayersSectionProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [localPlayers, setLocalPlayers] = useState<HitPlayer[]>(players);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ firstName: string; number?: string }>({
    defaultValues: { firstName: '', number: '' },
  });

  const duplicate = () =>
    toast({ variant: 'destructive', title: 'Duplicate name', description: HitAThonErrors.DUPLICATE_PLAYER });

  const handleAddPlayer = (data: { firstName: string; number?: string }) => {
    const firstName = data.firstName.trim();
    if (!firstName) return;

    if (localPlayers.some((p) => p.first_name.toLowerCase() === firstName.toLowerCase())) {
      duplicate();
      return;
    }

    startTransition(async () => {
      const result = await addHitPlayer(contest.id, {
        firstName,
        number: data.number ? parseInt(data.number, 10) : undefined,
      });

      if (!result?.data) {
        if (result?.error?.message === HitAThonErrors.DUPLICATE_PLAYER) {
          duplicate();
          return;
        }
        toast({ variant: 'destructive', title: 'Error', description: result?.error?.message });
        return;
      }

      const added = result.data;
      setLocalPlayers((current) => sortHitPlayers([...current, added]));
      reset();
      toast({ title: 'Player added', description: `${added.first_name} has been added.` });
    });
  };

  const handleRemovePlayer = (player: HitPlayer) => {
    startTransition(async () => {
      const result = await removeHitPlayer(contest.id, player.id);

      if (result?.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error.message });
        return;
      }

      setLocalPlayers((current) => current.filter((p) => p.id !== player.id));
      toast({ title: 'Player removed' });
    });
  };

  const copyLink = async (player: HitPlayer) => {
    const url = `${getURL()}/contest/${contest.slug}?ref=${player.slug}`;
    if (!(await copyText(url))) {
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong. Please try again.' });
      return;
    }
    toast({ title: 'Link copied', description: `Link for ${player.first_name} copied to clipboard.` });
  };

  return (
    <SetupSection
      id='players'
      title='Players'
      description='Each player gets their own page and link. Supporters pledge to one player.'
    >
      <form onSubmit={handleSubmit(handleAddPlayer)} aria-labelledby='players-title'>
        <div className={css.addMember}>
          <DashInput
            aria-label='First name'
            aria-describedby='players-hint'
            placeholder='First name'
            autoComplete='off'
            maxLength={40}
            aria-invalid={errors.firstName ? true : undefined}
            {...register('firstName', { required: true })}
          />
          <DashInput
            aria-label='Number, optional'
            placeholder='# (optional)'
            type='number'
            min='1'
            step='1'
            {...register('number')}
          />
          <BusyButton busy={isPending} type='submit' look='quiet'>
            Add
          </BusyButton>
        </div>
        <p id='players-hint' className={`${css.small} ${css.gapTopSmall}`}>
          First names only. Player pages are public.
        </p>
      </form>

      {localPlayers.length > 0 ? (
        <ul className={`${css.members} ${css.gapTop}`}>
          {localPlayers.map((player) => (
            <li key={player.id}>
              <div className={css.grow}>
                <p>
                  <span className={css.strong}>{player.first_name}</span>
                  {player.number !== null && <span className={css.soft}> #{player.number}</span>}
                </p>
              </div>
              <DashButton look='quiet' onClick={() => copyLink(player)}>
                Copy Link<span className={srOnly}> for {player.first_name}</span>
              </DashButton>
              <IconButton
                label={`Remove ${player.first_name}`}
                onClick={() => handleRemovePlayer(player)}
                disabled={isPending}
              >
                <Trash2 aria-hidden='true' />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${css.soft} ${css.gapTopSmall}`}>No players yet. Add players to give each one a link.</p>
      )}
    </SetupSection>
  );
}
