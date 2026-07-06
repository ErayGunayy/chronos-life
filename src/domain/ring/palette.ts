/**
 * The Living Ring default palette (CLAUDE.md §5.2.3).
 *
 * Requirements encoded here, not just intended:
 * - assigned in creation order (1st category → color 1, …), never random;
 * - ~8–10 colors sized for realistic category counts;
 * - because segment ordering is dynamic, any two colors can end up adjacent —
 *   every color must be distinguishable from every other one, not just its
 *   usual neighbors;
 * - color-blind aware: based on Paul Tol's "muted" scheme, designed to stay
 *   apart under common color-vision deficiencies by varying lightness and
 *   saturation alongside hue.
 *
 * Categories beyond the palette get tonal variations (lighter/darker shades)
 * of the base colors rather than new, visually-similar hues.
 */
export const DEFAULT_CATEGORY_PALETTE: readonly string[] = [
  '#44aa99', // teal
  '#332288', // indigo
  '#cc6677', // rose
  '#999933', // olive
  '#88ccee', // light cyan
  '#882255', // wine
  '#ddcc77', // sand
  '#117733', // green
  '#aa4499', // purple
] as const;

/** Neutral for routine (<1h) pauses: dark, silent, never draws the eye (§5.2.1). */
export const RING_ROUTINE_COLOR = '#57503f';

/** Remembered time whose category is still unset — quiet mid warm neutral. */
export const RING_UNCATEGORIZED_COLOR = '#a89a85';

/**
 * Warm amber accent for a still-open Forgotten Moment (§5.2.1) — dashed
 * outline only, never a category color, paired with the breathing motion:
 * this is specifically the "still fillable" signal.
 *
 * Kept in sync with `--question` in src/app/globals.css (Today's Story uses
 * the same "still open" concept) — two independent literals, since CSS
 * can't read this TS constant. Changing one should prompt checking the other.
 * This constant has no dark-mode variant yet (see globals.css's dark
 * `--question: #d9a655`); the ring doesn't route through CSS custom
 * properties today, so it won't adapt to dark mode until that's revisited.
 */
export const RING_FORGOTTEN_ACCENT = '#a97f33';

/**
 * The un-narrated remainder of the 24h day — the part of the period a story
 * doesn't cover yet (the night, hours not told). A faint warm neutral so this
 * (often the largest) wedge recedes into the background instead of dominating:
 * an open invitation ("Yet to tell"), never a judgment (§5.2 / §5.8.4).
 */
export const RING_UNACCOUNTED_COLOR = '#c9c2b4';

/**
 * Neutral, static color for an *answered* "I don't remember" record (§6.4) —
 * deliberately NOT the amber above. §5.2.1 only specs the ring's routine-gap
 * vs. Forgotten-Moment treatment; it never mandated reusing the amber for
 * this third, answered state, and doing so read as visually confusable with
 * the still-open breathing arc. Matches `--muted` in globals.css, the same
 * de-emphasized tone Today's Story already uses for this exact record kind —
 * "a fact, stated plainly, not re-asked" rather than "still open".
 */
export const RING_UNREMEMBERED_COLOR = '#83807a';

/**
 * Fixed color for a palette index. Indexes past the palette cycle through
 * tonal variations of the base colors (§5.2.3): lighter, then darker, then
 * lighter again — never a brand-new near-identical hue.
 */
export function colorForCategoryIndex(index: number): string {
  if (index < 0 || !Number.isInteger(index)) {
    throw new RangeError(`palette index must be a non-negative integer, got: ${index}`);
  }
  const base = DEFAULT_CATEGORY_PALETTE[index % DEFAULT_CATEGORY_PALETTE.length];
  const cycle = Math.floor(index / DEFAULT_CATEGORY_PALETTE.length);
  if (cycle === 0) return base;
  const variant = (cycle - 1) % 2;
  return variant === 0 ? shiftLightness(base, 0.3) : shiftLightness(base, -0.22);
}

/** Mixes a hex color toward white (amount > 0) or black (amount < 0). */
export function shiftLightness(hex: string, amount: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new RangeError(`expected #rrggbb color, got: ${hex}`);
  const channels = [0, 2, 4].map((offset) =>
    parseInt(match[1].slice(offset, offset + 2), 16),
  );
  const target = amount >= 0 ? 255 : 0;
  const strength = Math.min(Math.abs(amount), 1);
  const mixed = channels.map((channel) =>
    Math.round(channel + (target - channel) * strength),
  );
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
