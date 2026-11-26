'use client';

import { type CSSProperties, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

import { Button } from '@/components/studio/button';
import { Sheet } from '@/components/studio/sheet';
import { srOnly } from '@/components/studio/theme';
import { Mid, Soft } from '@/components/studio/type';
import { copyText, selectText } from '@/utils/copy-text';

import css from './contest.module.css';

interface ShareButtonProps {
  contestName: string;
  contestSlug: string;
  /** Kept on the link, so whoever sent this visitor gets the credit for the next ones too. */
  referral: string | null;
  /** Only for the owner. */
  accessPin: string | null;
  colors: CSSProperties;
  /** The sheet's words. A hit-a-thon player's page has its own. */
  title?: string;
  description?: string;
}

/** "Share", and the sheet it opens: the link, and a QR code to show or download. */
export function ShareButton({
  contestName,
  contestSlug,
  referral,
  accessPin,
  colors,
  title = 'Share',
  description = 'Send this link to anyone who might help.',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [hasQr, setHasQr] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLSpanElement>(null);

  // Only read once the sheet is open, so never on the server
  const contestUrl = isOpen
    ? `${window.location.origin}/contest/${contestSlug}${referral ? `?ref=${encodeURIComponent(referral)}` : ''}`
    : '';

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setIsCopied(false);
    setHasQr(false);
  };

  const handleCopy = async () => {
    if (await copyText(contestUrl)) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      // Ready to copy by hand
      selectText(urlRef.current);
    }
  };

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${contestName.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <>
      <Button look='link' aria-haspopup='dialog' onClick={() => handleOpenChange(true)}>
        Share
      </Button>
      <Sheet
        open={isOpen}
        onOpenChange={handleOpenChange}
        style={colors}
        title={title}
        description={description}
        footer={
          <>
            <Button onClick={handleCopy}>{isCopied ? 'Copied!' : 'Copy link'}</Button>
            {hasQr ? (
              <Button look='link' onClick={handleDownload}>
                Download QR
              </Button>
            ) : (
              <Button look='link' onClick={() => setHasQr(true)}>
                QR code
              </Button>
            )}
            <span role='status' className={srOnly}>
              {isCopied && 'Copied!'}
            </span>
          </>
        }
      >
        <Mid className={css.url}>
          <span ref={urlRef}>{contestUrl.replace(/^https?:\/\//, '')}</span>
        </Mid>
        {accessPin && (
          <Soft className={css.accessPin}>
            Access PIN <strong>{accessPin}</strong>
          </Soft>
        )}
        {hasQr && (
          <div ref={qrRef} className={css.qr}>
            <QRCodeCanvas value={contestUrl} size={200} level='H' marginSize={0} role='img' aria-label='QR code' />
          </div>
        )}
      </Sheet>
    </>
  );
}
