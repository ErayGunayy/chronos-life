import type { RingSegmentView } from '@/app/api/ring/handler';
import {
  RING_FORGOTTEN_ACCENT,
  RING_ROUTINE_COLOR,
  RING_UNCATEGORIZED_COLOR,
} from '@/domain/ring/palette';

/** Human names for ring segments (§5.1 — story language, never database language). */
export function segmentLabel(segment: RingSegmentView): string {
  switch (segment.kind) {
    case 'category':
      return segment.category;
    case 'uncategorized':
      return 'Not yet sorted';
    case 'routine-gap':
      return 'Quiet pauses';
    case 'unremembered':
      return 'Unremembered time';
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
    case 'forgotten':
      return RING_FORGOTTEN_ACCENT;
  }
}
