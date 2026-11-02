// A starting palette for new tags (the researcher can always override via the color picker).
export const TAG_PALETTE = [
  '#c1272d', // sonidero red
  '#1b5e20', // heritage green
  '#f2a007', // marquee gold
  '#004e89', // flyer blue
  '#a8326b', // magenta
  '#6a4c93', // purple
  '#1282a2', // teal
  '#d1495b', // coral
  '#8d6a46', // warm brown
  '#3a5a40', // olive
];

/** Deterministic fallback color for a tag that has no explicit color, based on its id. */
export function hashColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

/** Picks readable text (near-black or near-white) against a given hex background color. */
export function contrastText(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1210' : '#fff8ec';
}
