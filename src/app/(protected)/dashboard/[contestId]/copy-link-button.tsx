'use client';

import { useState } from 'react';

import { DashButton } from '@/components/studio/dashboard/dash-button';

import { ShareDialog } from './share-dialog';

interface CopyLinkButtonProps {
  url: string;
  code: string | null;
  contestName: string;
}

export function CopyLinkButton({ url, code, contestName }: CopyLinkButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <DashButton look='quiet' onClick={() => setIsModalOpen(true)}>
        Share
      </DashButton>

      <ShareDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contestUrl={url}
        contestCode={code}
        contestName={contestName}
      />
    </>
  );
}
