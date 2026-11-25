import Image from 'next/image';

import { initialsOf } from '@/components/studio/shell/organizer-header';

import css from './contest.module.css';

interface OrganizerPrintProps {
  contestName: string;
  imageUrl: string | null;
  imagePosition: string | null;
  logoUrl: string | null;
  description: string | null;
}

/** "top-left" and so on, as `object-position` */
function objectPosition(position: string | null): string {
  const [y, x = y] = (position ?? 'center').split('-');
  const percent: Record<string, string> = { left: '0%', top: '0%', right: '100%', bottom: '100%' };
  return `${percent[x] ?? '50%'} ${percent[y] ?? '50%'}`;
}

/**
 * The organizer's image, lying in the same light as the board, and what they wrote. Without an image: two tiles in their
 * colors, with their logo or the contest's initials on the first.
 */
export function OrganizerPrint({ contestName, imageUrl, imagePosition, logoUrl, description }: OrganizerPrintProps) {
  return (
    <>
      {imageUrl ? (
        <div className={css.print}>
          <Image
            src={imageUrl}
            alt={contestName}
            fill
            sizes='(max-width: 999px) 92vw, 42vw'
            style={{ objectPosition: objectPosition(imagePosition) }}
          />
        </div>
      ) : (
        <div aria-hidden='true' className={css.colors}>
          <span className={css.color}>
            {logoUrl ? <Image src={logoUrl} alt='' width={192} height={192} /> : initialsOf(contestName)}
          </span>
          <span className={css.color} />
        </div>
      )}
      {description && <p className={css.description}>{description}</p>}
    </>
  );
}
