'use client';

import type { RingSegmentView } from '@/app/api/ring/handler';
import { pointOnRing, ringArcs, type ArcSpec } from '@/components/ring/geometry';
import { segmentColor, segmentKey, segmentLabel } from '@/components/ring/labels';
import { formatMinutes } from '@/lib/time/duration';

const VIEWBOX = 240;
const CENTER = VIEWBOX / 2;
const RADIUS = 96;
const SOLID_STROKE = 20;
/** Wider invisible stroke so a thin breathing arc is still an easy tap target. */
const HIT_STROKE = 30;
/** SVG transform-origin for the hover scale-up and the reveal animation alike. */
const ORIGIN = `${CENTER}px ${CENTER}px`;

type ForgottenSegment = Extract<RingSegmentView, { kind: 'forgotten' }>;

type Props = {
  segments: readonly RingSegmentView[];
  centerTitle: string;
  centerSubtitle: string;
  hoveredKey: string | null;
  onHoverKey: (key: string | null) => void;
  /** Changing this replays the gentle grow-in (§5.2: "segments grow gently"). */
  revealKey: string;
  /** Today view: tapping a breathing arc opens the fill-in dialog (§5.2.2). */
  onForgottenSelect?: (segment: ForgottenSegment) => void;
  /** Period views: the aggregate arc navigates to the story instead (§5.2.4). */
  onForgottenNavigate?: () => void;
};

/**
 * The Living Ring (§5.2) — a pure view over already-computed segments.
 * Solid fixed-color arcs for categories, a silent dark arc for routine
 * pauses, a fine static dotted arc (neutral, muted) for answered
 * "unremembered" time, and breathing dashed amber arcs for still-open
 * Forgotten Moments — color AND texture differ between the two "unaccounted
 * time" states so they're never confused, at every period scale (§5.2.1).
 */
export function LivingRing({
  segments,
  centerTitle,
  centerSubtitle,
  hoveredKey,
  onHoverKey,
  revealKey,
  onForgottenSelect,
  onForgottenNavigate,
}: Props) {
  const arcs = ringArcs(
    segments.map((segment) => segment.share),
    CENTER,
    CENTER,
    RADIUS,
  );

  const hoveredIndex = segments.findIndex(
    (segment, index) => segmentKey(segment, index) === hoveredKey,
  );
  const hoveredArc = hoveredIndex >= 0 ? arcs[hoveredIndex] : null;
  const hoveredSegment = hoveredIndex >= 0 ? segments[hoveredIndex] : null;

  return (
    <div className="relative mx-auto w-56 sm:w-64 lg:w-72">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-auto w-full overflow-visible">
        {segments.length === 0 && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--line)"
            strokeWidth={2}
            strokeDasharray="3 6"
          />
        )}
        <g key={revealKey} className="ring-reveal" style={{ transformOrigin: ORIGIN }}>
          {segments.map((segment, index) => {
            const key = segmentKey(segment, index);
            return (
              <RingArc
                key={key}
                segment={segment}
                arc={arcs[index]}
                isHovered={hoveredKey === key}
                onHoverChange={(hovered) => onHoverKey(hovered ? key : null)}
                onForgottenSelect={onForgottenSelect}
                onForgottenNavigate={onForgottenNavigate}
              />
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <p className="font-display text-2xl text-foreground">{centerTitle}</p>
        <p className="mt-1 text-xs leading-4 text-muted">{centerSubtitle}</p>
      </div>

      {hoveredArc && hoveredSegment && (
        <RingTooltip arc={hoveredArc} segment={hoveredSegment} />
      )}
    </div>
  );
}

/** Anchored to the hovered arc's own midpoint — no pointer tracking needed. */
function RingTooltip({ arc, segment }: { arc: ArcSpec; segment: RingSegmentView }) {
  const mid = pointOnRing(CENTER, CENTER, RADIUS, (arc.startAngle + arc.endAngle) / 2);
  const leftPct = (mid.x / VIEWBOX) * 100;
  const topPct = (mid.y / VIEWBOX) * 100;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-md border border-line bg-card px-2 py-1 text-xs whitespace-nowrap text-foreground shadow-sm"
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
    >
      {segmentLabel(segment)} — {formatMinutes(segment.durationMinutes)}
    </div>
  );
}

function RingArc({
  segment,
  arc,
  isHovered,
  onHoverChange,
  onForgottenSelect,
  onForgottenNavigate,
}: {
  segment: RingSegmentView;
  arc: ArcSpec;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  onForgottenSelect?: (segment: ForgottenSegment) => void;
  onForgottenNavigate?: () => void;
}) {
  const color = segmentColor(segment);
  const label = `${segmentLabel(segment)} — ${formatMinutes(segment.durationMinutes)}`;
  const hoverClass = isHovered
    ? 'scale-[1.035] drop-shadow-[0_1px_2px_rgba(38,38,36,0.22)]'
    : '';

  if (segment.kind !== 'forgotten') {
    const isUnremembered = segment.kind === 'unremembered';
    return (
      <path
        d={arc.path}
        fill="none"
        stroke={color}
        strokeWidth={isUnremembered ? 10 : SOLID_STROKE}
        // Fine dots (not the breathing arc's longer dashes) so the two
        // "unaccounted time" states read as distinct shapes, not just colors —
        // this one is answered and settled, never confused with "still open".
        strokeDasharray={isUnremembered ? '1.5 5' : undefined}
        strokeLinecap={isUnremembered ? 'round' : 'butt'}
        opacity={isUnremembered && !isHovered ? 0.55 : 1}
        tabIndex={0}
        aria-label={label}
        style={{ transformOrigin: ORIGIN }}
        className={`transition-[transform,filter] duration-150 ease-out focus-visible:outline-none ${hoverClass}`}
        onPointerEnter={() => onHoverChange(true)}
        onPointerLeave={() => onHoverChange(false)}
        onFocus={() => onHoverChange(true)}
        onBlur={() => onHoverChange(false)}
      >
        <title>{label}</title>
      </path>
    );
  }

  const activate = onForgottenSelect
    ? () => onForgottenSelect(segment)
    : onForgottenNavigate;
  const ariaLabel = forgottenAriaLabel(segment, Boolean(onForgottenSelect));

  return (
    <g
      style={{ transformOrigin: ORIGIN }}
      className={`transition-transform duration-150 ease-out ${isHovered ? 'scale-[1.035]' : ''}`}
    >
      <path
        aria-hidden
        d={arc.path}
        fill="none"
        stroke={color}
        strokeDasharray="5 8"
        strokeLinecap="round"
        className="ring-breathe"
      />
      {activate && (
        <path
          d={arc.path}
          fill="none"
          stroke="transparent"
          strokeWidth={HIT_STROKE}
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          className="ring-hit cursor-pointer"
          onClick={activate}
          onPointerEnter={() => onHoverChange(true)}
          onPointerLeave={() => onHoverChange(false)}
          onFocus={() => onHoverChange(true)}
          onBlur={() => onHoverChange(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate();
            }
          }}
        >
          <title>{label}</title>
        </path>
      )}
    </g>
  );
}

function forgottenAriaLabel(segment: ForgottenSegment, isFillable: boolean): string {
  if (isFillable && segment.slices.length === 1) {
    const slice = segment.slices[0];
    return `Still unwritten, ${slice.startLabel}–${slice.endLabel} — open to fill in`;
  }
  return 'Still unwritten moments — see the story';
}
