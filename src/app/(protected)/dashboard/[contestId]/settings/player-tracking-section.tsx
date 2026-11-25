'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { DashButton, DashInput, IconButton } from '@/components/studio/dashboard/dash-button';
import { SwitchRow } from '@/components/studio/setup/fields';
import { SetupSection } from '@/components/studio/setup/section';
import { srOnly } from '@/components/studio/theme';
import { useToast } from '@/components/ui/use-toast';
import { updateContest } from '@/features/contests/actions/update-contest';
import { Player } from '@/features/contests/types/player';
import { generatePlayerSlug } from '@/features/contests/utils/player-slug';
import { Database } from '@/libs/supabase/types';
import { getURL } from '@/utils/get-url';

import css from '@/components/studio/setup/setup.module.css';

type Contest = Database['public']['Tables']['contests']['Row'];

interface PlayerTrackingSectionProps {
  contest: Contest;
  squaresPerPlayer?: Record<string, number>;
}

export function PlayerTrackingSection({ contest, squaresPerPlayer = {} }: PlayerTrackingSectionProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const players = (contest.players as unknown as Player[]) || [];
  const [localPlayers, setLocalPlayers] = useState<Player[]>(players);
  const [isEnabled, setIsEnabled] = useState(contest.enable_player_tracking);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ name: string; number?: string }>({
    defaultValues: { name: '', number: '' },
  });

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    startTransition(async () => {
      const result = await updateContest(contest.id, {
        enable_player_tracking: enabled,
      });

      if (result?.error) {
        setIsEnabled(!enabled);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error.message,
        });
        return;
      }

      toast({
        title: enabled ? 'Player tracking enabled' : 'Player tracking disabled',
      });
    });
  };

  const handleAddPlayer = (data: { name: string; number?: string }) => {
    const trimmedName = data.name.trim();
    if (!trimmedName) return;

    // Check for duplicate names
    if (localPlayers.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Duplicate name',
        description: 'A player with this name already exists.',
      });
      return;
    }

    const newPlayer: Player = {
      name: trimmedName,
      number: data.number ? parseInt(data.number, 10) : undefined,
      slug: generatePlayerSlug(trimmedName, localPlayers),
    };

    const updatedPlayers = [...localPlayers, newPlayer];
    setLocalPlayers(updatedPlayers);
    reset();

    startTransition(async () => {
      const result = await updateContest(contest.id, {
        players: updatedPlayers as unknown as Database['public']['Tables']['contests']['Update']['players'],
      });

      if (result?.error) {
        setLocalPlayers(localPlayers);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error.message,
        });
        return;
      }

      toast({
        title: 'Player added',
        description: `${newPlayer.name} has been added.`,
      });
    });
  };

  const handleRemovePlayer = (slug: string) => {
    const updatedPlayers = localPlayers.filter((p) => p.slug !== slug);
    const removedPlayer = localPlayers.find((p) => p.slug === slug);
    setLocalPlayers(updatedPlayers);

    startTransition(async () => {
      const result = await updateContest(contest.id, {
        players: updatedPlayers as unknown as Database['public']['Tables']['contests']['Update']['players'],
      });

      if (result?.error) {
        setLocalPlayers(localPlayers);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error.message,
        });
        return;
      }

      toast({
        title: 'Player removed',
        description: `${removedPlayer?.name} has been removed.`,
      });
    });
  };

  const copyLink = async (player: Player) => {
    const url = `${getURL()}/contest/${contest.slug}?ref=${player.slug}`;
    await navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied',
      description: `Referral link for ${player.name} copied to clipboard.`,
    });
  };

  return (
    <SetupSection id='player-tracking' title='Player Tracking' description='Track which team members sell squares'>
      {/* Enable Toggle */}
      <SwitchRow
        id='enable_tracking'
        label='Enable player tracking'
        hint='Give each team member a unique link to track their sales'
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />

      {/* Player Management */}
      {isEnabled && (
        <>
          {/* Add Player Form */}
          <form onSubmit={handleSubmit(handleAddPlayer)} aria-labelledby='add-team-member' className={css.gapTopSmall}>
            <p id='add-team-member' className={css.label}>
              Add Team Member
            </p>
            <div className={css.addMember}>
              <DashInput
                aria-label='Name'
                placeholder='Name'
                autoComplete='off'
                aria-invalid={errors.name ? true : undefined}
                {...register('name', { required: true })}
              />
              <DashInput
                aria-label='Number, optional'
                placeholder='# (optional)'
                type='number'
                {...register('number')}
              />
              <DashButton type='submit' look='quiet' disabled={isPending} aria-busy={isPending}>
                Add
              </DashButton>
            </div>
          </form>

          {/* Player List */}
          {localPlayers.length > 0 && (
            <>
              <p className={`${css.label} ${css.gapTop}`}>Team Members</p>
              <ul className={css.members}>
                {localPlayers.map((player) => (
                  <li key={player.slug}>
                    <div className={css.grow}>
                      <p>
                        <span className={css.strong}>{player.name}</span>
                        {player.number !== undefined && <span className={css.soft}> #{player.number}</span>}
                      </p>
                      <p className={css.small}>{squaresPerPlayer[player.name] || 0} squares sold</p>
                    </div>
                    <DashButton look='quiet' onClick={() => copyLink(player)}>
                      Copy Link<span className={srOnly}> for {player.name}</span>
                    </DashButton>
                    <IconButton
                      label={`Remove ${player.name}`}
                      onClick={() => handleRemovePlayer(player.slug)}
                      disabled={isPending}
                    >
                      <Trash2 aria-hidden='true' />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </>
          )}

          {localPlayers.length === 0 && (
            <p className={`${css.soft} ${css.gapTopSmall}`}>
              No team members added yet. Add players above to generate referral links.
            </p>
          )}
        </>
      )}
    </SetupSection>
  );
}
