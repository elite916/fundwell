import { notFound, redirect } from 'next/navigation';

import { DashPage, PageHead, Panel } from '@/components/studio/dashboard/dash-page';
import { getUser } from '@/features/account/controllers/get-user';
import { isAdmin } from '@/features/admin/require-admin';
import { getSuperBowlPage } from '@/features/super-bowl/queries';
import { cn } from '@/utils/cn';

import { ContestsTable } from './contests-table';
import { ScoresForm } from './scores-form';
import { SendEmailsButton } from './send-emails-button';
import { TeamsForm } from './teams-form';

import css from './super-bowl.module.css';
import setup from '@/components/studio/setup/setup.module.css';

export const metadata = {
  title: 'Super Bowl - Fundwell',
};

// Saving the scores updates every contest, then sends its emails one at a time
export const maxDuration = 300;

export default async function SuperBowlPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  if (!(await isAdmin(user.id))) {
    notFound();
  }

  const { game, contests, emails } = await getSuperBowlPage();

  const counts = [
    { label: 'Sent', value: emails.sent },
    { label: 'Waiting', value: emails.waiting },
    { label: 'Refused', value: emails.refused },
    { label: 'Not confirmed', value: emails.notConfirmed },
  ];

  return (
    <DashPage className={cn(setup.scale, css.sections)}>
      <PageHead
        title='Super Bowl'
        sub={['Enter the score after each quarter. Every Super Bowl contest in progress updates.']}
      />

      <Panel aria-labelledby='teams'>
        <h2 id='teams'>Teams</h2>
        <TeamsForm game={game} />
      </Panel>

      <Panel aria-labelledby='scores'>
        <h2 id='scores'>Scores</h2>
        <ScoresForm game={game} />
      </Panel>

      <Panel aria-labelledby='contests'>
        <h2 id='contests'>Contests</h2>
        <ContestsTable contests={contests} game={game} />
      </Panel>

      <Panel aria-labelledby='emails'>
        <h2 id='emails'>Emails</h2>
        <dl className={css.counts}>
          {counts.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <SendEmailsButton />
      </Panel>
    </DashPage>
  );
}
