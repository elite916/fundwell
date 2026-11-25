'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { ManageNumbersModal } from '@/features/contests/components/manage-numbers-modal';

interface Contest {
  id: string;
  status: string;
  row_numbers: number[] | null;
  col_numbers: number[] | null;
  numbers_auto_generated: boolean | null;
  row_team_name: string | null;
  col_team_name: string | null;
}

interface ManageNumbersButtonProps {
  contest: Contest;
}

export function ManageNumbersButton({ contest }: ManageNumbersButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <DashButton look='quiet' onClick={() => setIsOpen(true)}>
        Manage Numbers
      </DashButton>

      <ManageNumbersModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        contest={contest}
        onSuccess={handleSuccess}
      />
    </>
  );
}
