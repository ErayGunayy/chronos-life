/**
 * Pure SVG arc math for the Living Ring. Two placement modes, both clockwise
 * from 12 o'clock — this module only turns numbers into arc paths; ordering and
 * meaning belong to the domain layer:
 *
 * - `ringArcs(shares)` — the aggregate (period) pie: packs segments end to end,
 *   sized by share, with padding between them (§5.2.4).
 * - `ringArcsClock(spans)` — the single-day 24h clock: places each band at its
 *   absolute position on the circle (00:00 at the top → 23:59), edges touching,
 *   no padding, so the ring reads like a real clock face (§5.2).
 */

export interface ArcSpec {
  /** SVG path (stroke it — no fill) tracing the arc clockwise. */
  readonly path: string;
  readonly startAngle: number;
  readonly endAngle: number;
}

/** A band's absolute position on the 24h clock, as fractions of the day [0, 1]. */
export interface ClockSpan {
  readonly startFraction: number;
  readonly endFraction: number;
}

/** Angular breathing room between segments so arcs read as separate. */
export const SEGMENT_PADDING_DEGREES = 2.5;

/**
 * A floor so slivers stay visible and (for forgotten arcs) tappable at every
 * period scale — a 20-minute pause on a year ring would otherwise vanish.
 */
export const MIN_SWEEP_DEGREES = 1.6;

const FULL_CIRCLE = 360;
const EPSILON = 1e-6;

/**
 * Allocates arcs for the given shares (any non-negative weights — they are
 * normalized). Returns one ArcSpec per share, in order. A single share fills
 * the whole ring; multiple shares split 360° minus the inter-segment padding.
 */
export function ringArcs(
  shares: readonly number[],
  cx: number,
  cy: number,
  radius: number,
): ArcSpec[] {
  if (shares.some((share) => share < 0 || !Number.isFinite(share))) {
    throw new RangeError('shares must be finite and non-negative');
  }
  const total = shares.reduce((sum, share) => sum + share, 0);
  if (shares.length === 0 || total <= 0) return [];

  if (shares.length === 1) {
    return [{ path: fullCirclePath(cx, cy, radius), startAngle: 0, endAngle: FULL_CIRCLE }];
  }

  const available = FULL_CIRCLE - shares.length * SEGMENT_PADDING_DEGREES;
  const sweeps = withMinimumSweep(
    shares.map((share) => (share / total) * available),
    available,
  );

  const arcs: ArcSpec[] = [];
  let cursor = 0;
  for (const sweep of sweeps) {
    const startAngle = cursor;
    const endAngle = cursor + sweep;
    arcs.push({ path: arcPath(cx, cy, radius, startAngle, endAngle), startAngle, endAngle });
    cursor = endAngle + SEGMENT_PADDING_DEGREES;
  }
  return arcs;
}

/**
 * Raises sub-minimum sweeps to MIN_SWEEP_DEGREES and shrinks the rest
 * proportionally so the total stays intact. If everything is tiny (many
 * segments), the minimum simply becomes an even split.
 */
function withMinimumSweep(sweeps: readonly number[], available: number): number[] {
  if (MIN_SWEEP_DEGREES * sweeps.length >= available) {
    return sweeps.map(() => available / sweeps.length);
  }

  const result = [...sweeps];
  for (let pass = 0; pass < sweeps.length; pass += 1) {
    const deficit = result.reduce(
      (sum, sweep) => sum + (sweep < MIN_SWEEP_DEGREES ? MIN_SWEEP_DEGREES - sweep : 0),
      0,
    );
    if (deficit <= EPSILON) break;

    const shrinkable = result.reduce(
      (sum, sweep) => sum + (sweep > MIN_SWEEP_DEGREES ? sweep - MIN_SWEEP_DEGREES : 0),
      0,
    );
    const shrinkFactor = (shrinkable - deficit) / shrinkable;
    for (let i = 0; i < result.length; i += 1) {
      result[i] =
        result[i] < MIN_SWEEP_DEGREES
          ? MIN_SWEEP_DEGREES
          : MIN_SWEEP_DEGREES + (result[i] - MIN_SWEEP_DEGREES) * shrinkFactor;
    }
  }
  return result;
}

/**
 * Places each band at its literal clock position — angle = fraction × 360°,
 * 0 = local midnight at 12 o'clock. Bands touch (no padding, no minimum sweep)
 * so the ring is a faithful 24h clock; a band that spans the whole day draws as
 * a full circle. Fractions must be in [0, 1] and each band's end ≥ its start.
 */
export function ringArcsClock(
  spans: readonly ClockSpan[],
  cx: number,
  cy: number,
  radius: number,
): ArcSpec[] {
  return spans.map(({ startFraction, endFraction }) => {
    if (
      !Number.isFinite(startFraction) ||
      !Number.isFinite(endFraction) ||
      startFraction < 0 ||
      endFraction > 1 + EPSILON ||
      endFraction < startFraction
    ) {
      throw new RangeError('clock spans must be within [0, 1] and non-decreasing');
    }
    const startAngle = startFraction * FULL_CIRCLE;
    const endAngle = endFraction * FULL_CIRCLE;
    if (endAngle - startAngle >= FULL_CIRCLE - EPSILON) {
      return { path: fullCirclePath(cx, cy, radius), startAngle: 0, endAngle: FULL_CIRCLE };
    }
    return { path: arcPath(cx, cy, radius, startAngle, endAngle), startAngle, endAngle };
  });
}

/** Point on the circle; angle 0 = 12 o'clock, increasing clockwise. */
export function pointOnRing(
  cx: number,
  cy: number,
  radius: number,
  angleDegrees: number,
): { x: number; y: number } {
  const radians = (angleDegrees * Math.PI) / 180;
  return { x: cx + radius * Math.sin(radians), y: cy - radius * Math.cos(radians) };
}

function arcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const from = pointOnRing(cx, cy, radius, startAngle);
  const to = pointOnRing(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${round(from.x)} ${round(from.y)} A ${radius} ${radius} 0 ${largeArc} 1 ${round(to.x)} ${round(to.y)}`;
}

/** A 360° arc has no distinct endpoints — draw it as two half circles. */
function fullCirclePath(cx: number, cy: number, radius: number): string {
  const top = pointOnRing(cx, cy, radius, 0);
  const bottom = pointOnRing(cx, cy, radius, 180);
  return (
    `M ${round(top.x)} ${round(top.y)} ` +
    `A ${radius} ${radius} 0 1 1 ${round(bottom.x)} ${round(bottom.y)} ` +
    `A ${radius} ${radius} 0 1 1 ${round(top.x)} ${round(top.y)}`
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
