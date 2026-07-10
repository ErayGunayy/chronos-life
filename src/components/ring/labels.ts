import type { RingSegmentView } from '@/app/api/ring/handler';
import {
  RING_FORGOTTEN_ACCENT,
  RING_ROUTINE_COLOR,
  RING_UNACCOUNTED_COLOR,
  RING_UNCATEGORIZED_COLOR,
  RING_UNREMEMBERED_COLOR,
} from '@/domain/ring/palette';

/** Human names for ring segments (§5.1 — story language, never database language). */
export function segmentLabel(segment: RingSegmentView): string {
  switch (segment.kind) {
    case 'category':
      return segment.category;
    case 'uncategorized':
      // The event's own title — each uncategorized moment shows as itself.
      return segment.title;
    case 'routine-gap':
      return 'Quiet pauses';
    case 'unremembered':
      return 'Unremembered time';
    case 'unaccounted':
      // The un-narrated rest of the day — inviting, never "you failed to log".
      return 'Yet to tell';
    case 'forgotten':
      return 'Still unwritten';
  }
}

export function segmentColor(segment: RingSegmentView): string {
  switch (segment.kind) {
    case 'category':
      return segment.color;
    case 'uncategorized':
      return RING_UNCATEGORIZED_COLOR;
    case 'routine-gap':
      return RING_ROUTINE_COLOR;
    case 'unremembered':
      return RING_UNREMEMBERED_COLOR;
    case 'unaccounted':
      return RING_UNACCOUNTED_COLOR;
    case 'forgotten':
      return RING_FORGOTTEN_ACCENT;
  }
}

/**
 * Stable identity for a segment — shared by the ring's arcs and the legend so
 * hovering either one can highlight the other, and used as the React key.
 *
 * On the clock layout the same category can appear several times (once per
 * block in the day), so a band is keyed by its position — unique and stable
 * across renders. On the aggregate layout each kind appears once, so it keys on
 * its own data; `index` only breaks ties for repeatable kinds.
 */
export function segmentKey(segment: RingSegmentView, index: number): string {
  if (segment.startFraction !== undefined) {
    return `${segment.kind}:${segment.startFraction.toFixed(5)}`;
  }
  if (segment.kind === 'category') return `category:${segment.category}`;
  if (segment.kind === 'forgotten' && segment.slices.length === 1) {
    return `forgotten:${segment.slices[0].startAt}`;
  }
  return `${segment.kind}:${index}`;
}
