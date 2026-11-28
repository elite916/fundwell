'use client';

import { type CSSProperties, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/studio/button';
import { Sheet, SheetGrabber } from '@/components/studio/sheet';
import { SideCard } from '@/components/studio/side-card';
import { srOnly } from '@/components/studio/theme';
import { Soft } from '@/components/studio/type';
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
  /** On wide screens, the id of an element beside the page to show the sheet in as a card (a hit-a-thon player's page). */
  besideId?: string;
}

/** Wide enough for the card beside the page. Same as the pages' two columns. */
const BESIDE_THE_PAGE = '(min-width: 1000px)';

/** "Share", and the sheet it opens: the link, and a QR code to show or download. */
export function ShareButton({
  contestName,
  contestSlug,
  referral,
  accessPin,
  colors,
  title = 'Share',
  description = 'Send this link to anyone who might help.',
  besideId,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  // The element to show the card in, decided when Share is pressed. Null for the sheet.
  const [beside, setBeside] = useState<HTMLElement | null>(null);
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
    setBeside(
      open && besideId && window.matchMedia(BESIDE_THE_PAGE).matches ? document.getElementById(besideId) : null
    );
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

  const content = (
    <div className={css.share}>
      <p className={css.url}>
        <span ref={urlRef}>{contestUrl.replace(/^https?:\/\//, '')}</span>
      </p>
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
      <div className={css.shareActions}>
        <Button look='team' className={css.copy} onClick={handleCopy}>
          {isCopied ? 'Copied!' : 'Copy link'}
        </Button>
        {hasQr ? (
          <Button look='ghost' onClick={handleDownload}>
            Download QR
          </Button>
        ) : (
          <Button look='ghost' onClick={() => setHasQr(true)}>
            QR code
          </Button>
        )}
        <span role='status' className={srOnly}>
          {isCopied && 'Copied!'}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <Button look='secondary' aria-haspopup='dialog' onClick={() => handleOpenChange(true)}>
        Share
      </Button>
      {beside ? (
        isOpen &&
        createPortal(
          <SideCard step='share' title={title} onClose={() => handleOpenChange(false)}>
            <Soft>{description}</Soft>
            {content}
          </SideCard>,
          beside
        )
      ) : (
        <Sheet
          open={isOpen}
          onOpenChange={handleOpenChange}
          style={colors}
          title={title}
          // Quiet, as in Figma's Share sheet (a sheet with a grabber shows its description in ink)
          description={<span className={css.shareNote}>{description}</span>}
          top={<SheetGrabber />}
        >
          {content}
        </Sheet>
      )}
    </>
  );
}
