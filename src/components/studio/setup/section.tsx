import type { ReactNode } from 'react';

import css from './setup.module.css';

interface SetupSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

/** A settings card: what it's for on the left, its controls on the right. */
export function SetupSection({ id, title, description, children }: SetupSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={css.section}>
      <header>
        <h2 id={`${id}-title`} tabIndex={-1}>
          {title}
        </h2>
        <p>{description}</p>
      </header>
      <div>{children}</div>
    </section>
  );
}
