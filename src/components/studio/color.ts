import type { CSSProperties } from 'react';

type Rgb = [number, number, number];

const BLACK = '#000000';
const WHITE = '#ffffff';
/** `--studio-tile` in theme.module.css */
const TILE = '#fbfbfa';

/** Reads #rgb or #rrggbb. Anything else is null. */
export function parseHex(value: string | null | undefined): Rgb | null {
  const hex = value?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!hex) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio between two hex colors, 1 to 21. Unreadable input counts as black. */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [a, b].map((hex) => luminance(parseHex(hex) ?? [0, 0, 0]));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Black or white, whichever reads better on the color. The better one is never under 4.58:1, on any hex. */
export function readableOn(hex: string): typeof BLACK | typeof WHITE {
  return contrastRatio(hex, WHITE) >= contrastRatio(hex, BLACK) ? WHITE : BLACK;
}

/** The darker side of a raised tile in this color. */
function sideOf(hex: string): string {
  return `#${(parseHex(hex) ?? [0, 0, 0])
    .map((v) =>
      Math.round(v * 0.63)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

/**
 * The color for "these squares are yours": the organizer's first color that stands out from a white tile (3:1),
 * or black when neither does.
 */
export function markColor(primary: string, secondary: string): string {
  return [primary, secondary].find((hex) => parseHex(hex) && contrastRatio(hex, TILE) >= 3) ?? BLACK;
}

/** CSS variables for an organizer's two colors. Any hex works; text on them is always black or white. */
export function organizerColors(primary?: string | null, secondary?: string | null): CSSProperties {
  const first = parseHex(primary) ? (primary as string).trim() : BLACK;
  const second = parseHex(secondary) ? (secondary as string).trim() : first;
  const mark = markColor(first, second);

  return {
    '--org': first,
    '--org-ink': readableOn(first),
    '--org-2': second,
    '--org-mark': mark,
    '--org-mark-ink': readableOn(mark),
    '--org-mark-side': sideOf(mark),
  } as CSSProperties;
}
