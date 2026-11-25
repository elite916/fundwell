'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

import { DashButton, DashInput } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { logger } from '@/utils/logger';

import css from './share-dialog.module.css';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestUrl: string;
  contestCode: string | null;
  contestName: string;
}

export function ShareDialog({ isOpen, onClose, contestUrl, contestCode, contestName }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(contestUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('share-qr-modal', error);
    }
  };

  const handleDownloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${contestName.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
    link.href = url;
    link.click();
  };

  return (
    <DashDialog
      open={isOpen}
      onClose={onClose}
      title='Share Contest'
      description='Share this QR code or link with participants'
    >
      <div className={css.code}>
        <div ref={qrRef} className={css.qr}>
          <QRCodeCanvas value={contestUrl} size={200} level='H' marginSize={0} title='QR code' />
        </div>
        {contestCode && (
          <>
            <p className={css.label}>Access PIN</p>
            <p className={css.pin}>{contestCode}</p>
          </>
        )}
      </div>

      <DashInput aria-label='Contest link' readOnly value={contestUrl} />

      <DashDialogFoot>
        <DashButton look='quiet' onClick={handleCopyLink}>
          {copied ? 'Copied!' : 'Copy Link'}
        </DashButton>
        <DashButton onClick={handleDownloadQr}>Download QR</DashButton>
      </DashDialogFoot>
    </DashDialog>
  );
}
