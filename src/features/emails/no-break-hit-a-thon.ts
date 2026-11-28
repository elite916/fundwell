/**
 * "Hit-a-thon" with non-breaking hyphens (U+2011), so a line never breaks inside it. For contest names in the
 * hit-a-thon emails' text. Subjects keep plain hyphens, so inbox search finds them (Brent, 2026-11-27).
 */
export function noBreakHitAThon(text: string): string {
  return text.replace(/\b(hit)-(a)-(thon)\b/gi, '$1‑$2‑$3');
}
