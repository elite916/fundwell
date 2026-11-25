import type { ReactNode } from 'react';

import { Display, Mid, Soft } from '@/components/studio/type';

import css from './text-page.module.css';

/** A page to read: the title, a line under it, then sections. */
export function TextPage({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className={css.page}>
      <Display as='h1' className={css.title}>
        {title}
      </Display>
      {intro && <div className={css.intro}>{intro}</div>}
      {children}
    </div>
  );
}

/** A heading with its text beside it, or under it on phones. */
export function TextSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={css.section}>
      <Mid as='h2' className={css.heading}>
        {title}
      </Mid>
      <div className={css.text}>{children}</div>
    </section>
  );
}

/** A short heading and a line or two, inside a section. */
export function TextItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className={css.item}>{title}</h3>
      <Soft>{children}</Soft>
    </div>
  );
}
