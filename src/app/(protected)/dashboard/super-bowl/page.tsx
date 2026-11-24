import { notFound } from 'next/navigation';

import { getUser } from '@/features/account/controllers/get-user';
import { isAdmin } from '@/features/admin/require-admin';
import {
  getProcessingLogs,
  getQuarterResults,
  getSuperBowlConfig,
  getSuperBowlContests,
} from '@/features/super-bowl/actions';

import { SuperBowlAdmin } from './super-bowl-admin';

export const metadata = {
  title: 'Super Bowl Automation | Fundwell',
};

export default async function SuperBowlPage() {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    notFound();
  }

  const [config, logs, results, contests] = await Promise.all([
    getSuperBowlConfig(),
    getProcessingLogs(),
    getQuarterResults(),
    getSuperBowlContests(),
  ]);

  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-white'>Super Bowl Automation</h1>
        <p className='mt-1 text-sm text-zinc-400'>
          Automated score tracking, winner detection, and email notifications.
        </p>
      </div>

      <SuperBowlAdmin
        initialConfig={config}
        initialLogs={logs}
        initialResults={results}
        initialContests={contests}
      />
    </div>
  );
}
