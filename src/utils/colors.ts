// A starting palette for new tags (the researcher can always override via the color picker).
// Kept muted and restrained so tags read as a legend, not confetti — plum is reserved
// as the app's own accent color and left out of this auto-assigned set.
export const TAG_PALETTE = [
  '#8a7a52', // ochre
  '#3f4a3d', // olive
  '#4a5a68', // slate
  '#8c5a3c', // terracotta
  '#5c6650', // sage
  '#6b5a6b', // mauve
  '#7a6a4a', // sand
  '#3c5a5a', // teal-gray
  '#6a4a4a', // brick
  '#555a3c', // moss
];

/** Deterministic fallback color for a tag that has no explicit color, based on its id. Only
 * guaranteed distinct up to TAG_PALETTE.length seeds — past that, two different seeds can hash
 * to the same bucket. For a legend where every entry must be a different color, use
 * distinctColors() instead, which assigns by position rather than by hash. */
export function hashColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

/** `count` visually distinct colors, guaranteed never to repeat. Uses the curated TAG_PALETTE
 * for the first 10 entries, then fills in further hues spaced evenly around the color wheel —
 * so a role or tag legend with more entries than the palette still never assigns the same color
 * to two different entries. */
export function distinctColors(count: number): string[] {
  const colors = TAG_PALETTE.slice(0, count);
  for (let i = colors.length; i < count; i++) {
    colors.push(hslToHex((i * 360) / count, 38, 40));
  }
  return colors;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Reads a CSS custom property's current resolved value (e.g. for use as an SVG fill,
 * where var() support is inconsistent). Falls back if the property isn't set yet. */
export function readCSSVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
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
