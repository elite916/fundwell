import Image from 'next/image';

import css from './contest.module.css';

interface OrganizerPrintProps {
  contestName: string;
  imageUrl: string | null;
  imagePosition: string | null;
  description: string | null;
}

/** "top-left" and so on, as `object-position` */
function objectPosition(position: string | null): string {
  const [y, x = y] = (position ?? 'center').split('-');
  const percent: Record<string, string> = { left: '0%', top: '0%', right: '100%', bottom: '100%' };
  return `${percent[x] ?? '50%'} ${percent[y] ?? '50%'}`;
}

/** The organizer's image, lying in the same light as the board, and what they wrote. Without an image, their colors. */
export function OrganizerPrint({ contestName, imageUrl, imagePosition, description }: OrganizerPrintProps) {
  return (
    <>
      <div className={css.print} aria-hidden={imageUrl ? undefined : true}>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={contestName}
            fill
            sizes='(max-width: 999px) 92vw, 42vw'
            style={{ objectPosition: objectPosition(imagePosition) }}
          />
        )}
      </div>
      {description && <p className={css.description}>{description}</p>}
    </>
  );
}
