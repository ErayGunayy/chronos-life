/**
 * The Living Ring default palette (CLAUDE.md §5.2.3), tuned for the Chronos
 * Design System (§8): **green-anchored** — the deep-green accent leads as the
 * first category, and the rest are muted, premium hues chosen to sit calmly
 * beside it rather than a bright/neon scheme.
 *
 * Requirements encoded here, not just intended:
 * - assigned in creation order (1st category → color 1, …), never random;
 * - ~8–10 colors sized for realistic category counts;
 * - because a category can appear anywhere (aggregate views reorder; the clock
 *   places bands by time), every color must be distinguishable from every other
 *   one, not just its usual neighbors;
 * - color-vision-deficiency aware: hues are spread around the wheel AND
 *   lightness is deliberately varied (deep green vs. light olive/teal), so two
 *   colours that collide under red-green CVD still separate by brightness — the
 *   second channel §5.2.3 asks for, not hue alone;
 * - deliberately avoids the "unwritten amber" lane (RING_FORGOTTEN_ACCENT) and
 *   the reserved neutral tones (routine / uncategorized / unremembered /
 *   unaccounted) so a category is never confused with a gap or the still-open
 *   question. (Design-system "Sleep = grey" is intentionally NOT a palette
 *   default — grey belongs to the gap states; Sleep gets a normal palette hue.)
 *
 * Categories beyond the palette get tonal variations (lighter/darker shades)
 * of the base colors rather than new, visually-similar hues.
 */
export const DEFAULT_CATEGORY_PALETTE: readonly string[] = [
  '#2f6d54', // deep green (brand-anchored)
  '#4166b3', // indigo blue
  '#c15f3c', // terracotta
  '#7e5aa6', // violet
  '#4e9a8e', // teal
  '#b24a78', // magenta
  '#8a9a3e', // olive
  '#2f8397', // cyan
  '#9c6b4a', // taupe
] as const;

/** Neutral for routine (<1h) pauses: dark, silent, never draws the eye (§5.2.1). */
export const RING_ROUTINE_COLOR = '#565a5e';

/** Remembered time whose category is still unset — quiet mid neutral. */
export const RING_UNCATEGORIZED_COLOR = '#9a9ca1';

/**
 * Amber accent for a still-open Forgotten Moment (§5.2.1) — dashed outline
 * only, never a category color, paired with the breathing motion: this is
 * specifically the "still fillable" signal.
 *
 * Kept in sync with `--question` in src/app/globals.css (Today's Story uses
 * the same "still open" concept) — two independent literals, since CSS
 * can't read this TS constant. Changing one should prompt checking the other.
 * A single value serves both themes (the ring doesn't route through CSS custom
 * properties yet); this amber reads on both the light paper and the dark
 * background — see globals.css's dark `--question: #f1a63b` for the CSS side.
 */
export const RING_FORGOTTEN_ACCENT = '#e59b28';

/**
 * The un-narrated remainder of the 24h day — the part of the period a story
 * doesn't cover yet (the night, hours not told). A faint neutral so this
 * (often the largest) wedge recedes into the background instead of dominating:
 * an open invitation ("Yet to tell"), never a judgment (§5.2 / §5.8.4).
 */
export const RING_UNACCOUNTED_COLOR = '#c7cace';

/**
 * Neutral, static color for an *answered* "I don't remember" record (§6.4) —
 * deliberately NOT the amber above. §5.2.1 only specs the ring's routine-gap
 * vs. Forgotten-Moment treatment; it never mandated reusing the amber for
 * this third, answered state, and doing so read as visually confusable with
 * the still-open breathing arc. A quiet mid-grey, the same de-emphasized tone
 * Today's Story uses for this record kind — "a fact, stated plainly, not
 * re-asked" rather than "still open".
 */
export const RING_UNREMEMBERED_COLOR = '#8a8c90';

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
