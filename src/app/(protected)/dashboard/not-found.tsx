import Link from 'next/link';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { DashPage, DashProblem } from '@/components/studio/dashboard/dash-page';

export default function DashboardNotFound() {
  return (
    <DashPage>
      <DashProblem title='Page not found'>
        <DashButton asChild>
          <Link href='/dashboard'>Back to Dashboard</Link>
        </DashButton>
      </DashProblem>
    </DashPage>
  );
}
