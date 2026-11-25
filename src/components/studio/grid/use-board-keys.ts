'use client';

import { type KeyboardEvent, useRef, useState } from 'react';

/** One tab stop for a hundred tiles: arrow keys, Home and End move between elements with `data-cell`. */
export function useBoardKeys() {
  const tableRef = useRef<HTMLTableElement>(null);
  const [tabStop, setTabStop] = useState(0);

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const current = Number((event.target as HTMLElement).dataset.cell);
    if (Number.isNaN(current)) return;
    const row = Math.floor(current / 10);
    const col = current % 10;
    const next = {
      ArrowRight: col < 9 ? current + 1 : current,
      ArrowLeft: col > 0 ? current - 1 : current,
      ArrowDown: row < 9 ? current + 10 : current,
      ArrowUp: row > 0 ? current - 10 : current,
      Home: event.ctrlKey ? 0 : row * 10,
      End: event.ctrlKey ? 99 : row * 10 + 9,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    tableRef.current?.querySelector<HTMLElement>(`[data-cell='${next}']`)?.focus();
  };

  return { tableRef, tabStop, setTabStop, handleKeyDown };
}
