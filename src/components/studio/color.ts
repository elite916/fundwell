import type { CSSProperties } from 'react';

type Rgb = [number, number, number];

const BLACK = '#000000';
const WHITE = '#ffffff';
/** `--color-ink` in theme.module.css */
const INK = '#1c1b18';
/** `--color-team` in theme.module.css: Fundwell green, for a page with no colors */
const FUNDWELL_GREEN = '#17603f';
/** `--color-team-accent` in theme.module.css: Fundwell gold, whose tints Figma sets by hand */
const FUNDWELL_GOLD = '#f2b233';

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

/** Text on a color: ink, as in Figma, where it reads at 4.5:1. Otherwise `readableOn`'s pick. */
function textOn(hex: string): string {
  const pick = readableOn(hex);
  return pick === BLACK && contrastRatio(hex, INK) >= 4.5 ? INK : pick;
}

/** The first of the colors that reads as text on the background (4.5:1), or the fallback. */
function firstReadableOn(background: string, colors: string[], fallback: string): string {
  return colors.find((hex) => contrastRatio(hex, background) >= 4.5) ?? fallback;
}

/** The color mixed into white, as a hex: the pale tints for pending squares. */
function tint(hex: string, amount: number): string {
  return `#${(parseHex(hex) ?? [0, 0, 0])
    .map((v) =>
      Math.round(255 - (255 - v) * amount)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

/**
 * The team tokens for an organizer's two colors: `team` is the first, `team-accent` the second. Any hex works; text on
 * them is always ink, black or white, and the squares that show a team color as text fall back to ink or white when
 * it wouldn't read.
 */
export function organizerColors(primary?: string | null, secondary?: string | null): CSSProperties {
  const first = parseHex(primary) ? (primary as string).trim() : FUNDWELL_GREEN;
  const second = parseHex(secondary) ? (secondary as string).trim() : first;

  return {
    '--color-team': first,
    '--color-on-team': textOn(first),
    '--color-team-accent': second,
    '--color-on-team-accent': textOn(second),
    // Mine: a team color on a white square. Past winner: a team color on an ink square.
    '--color-square-mine-text': firstReadableOn(WHITE, [first, second], INK),
    '--color-square-past-winner-text': firstReadableOn(INK, [second, first], WHITE),
    ...(second.toLowerCase() !== FUNDWELL_GOLD && {
      '--color-square-pending': tint(second, 0.25),
      '--color-square-pending-stripe': tint(second, 0.5),
    }),
  } as CSSProperties;
}
