'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ForgottenSliceView,
  RingPeriod,
  RingResponse,
  RingSegmentView,
} from '@/app/api/ring/handler';
import type { GapView } from '@/app/api/day/handler';
import { fetchRing } from '@/components/ring/api';
import { segmentColor, segmentKey, segmentLabel } from '@/components/ring/labels';
import { LivingRing } from '@/components/ring/LivingRing';
import { GapFillForm } from '@/components/today/GapFillForm';
import { aggregateForgottenLead, gapFillHint, gapFillQuestion } from '@/domain/forgotten-moments/copy';
import { formatMinutes } from '@/lib/time/duration';

const PERIODS: readonly { value: RingPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const REMEMBERED_SUBTITLES: Record<RingPeriod, string> = {
  today: 'remembered today',
  week: 'remembered this week',
  month: 'remembered this month',
  year: 'remembered this year',
};

type Props = {
  localDate: string;
  timezone: string;
  /** Bumped by the parent whenever the day's memories change. */
  refreshToken: number;
  /** A gap was filled through the ring — the story below needs refreshing. */
  onChanged: () => void;
  /** Aggregate forgotten arc tapped on a period view → show the story (§5.2.4). */
  onShowStory: () => void;
};

/**
 * The Living Ring surface: period switcher, the ring itself, the tap-to-fill
 * micro-dialog (§5.2.2 — reuses the existing gap-fill capture, no new
 * mechanism), and a legend carrying each category's fixed color.
 */
export function RingSection({ localDate, timezone, refreshToken, onChanged, onShowStory }: Props) {
  const [period, setPeriod] = useState<RingPeriod>('today');
  const [ring, setRing] = useState<RingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSlice, setActiveSlice] = useState<ForgottenSliceView | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Latest-wins guard, same as TodayApp: a stale response never overwrites.
  const fetchSequence = useRef(0);
  // Per-period response cache so re-clicking a period is instant instead of
  // re-hitting the network. An in-flight map dedupes a background prefetch and
  // a click that race for the same period. Both are keyed by the data identity
  // (date + tz + refreshToken), so a new refreshToken — the day's memories
  // changed — is a fresh generation and nothing stale is ever served.
  const cacheRef = useRef(new Map<string, RingResponse>());
  const inflightRef = useRef(new Map<string, Promise<RingResponse>>());
  const generation = `${localDate}:${timezone}:${refreshToken}`;

  const loadPeriod = useCallback(
    (target: RingPeriod): Promise<RingResponse> => {
      const key = `${generation}:${target}`;
      const cached = cacheRef.current.get(key);
      if (cached) return Promise.resolve(cached);
      const inflight = inflightRef.current.get(key);
      if (inflight) return inflight;

      const request = fetchRing(localDate, timezone, target)
        .then((loaded) => {
          cacheRef.current.set(key, loaded);
          inflightRef.current.delete(key);
          return loaded;
        })
        .catch((cause) => {
          inflightRef.current.delete(key);
          throw cause;
        });
      inflightRef.current.set(key, request);
      return request;
    },
    [generation, localDate, timezone],
  );

  // A new generation makes every cached period stale — drop it so memory stays
  // bounded and the next read re-fetches fresh data.
  useEffect(() => {
    cacheRef.current = new Map();
    inflightRef.current = new Map();
  }, [generation]);

  // Show the active period: instant from cache, otherwise fetch (latest wins).
  useEffect(() => {
    // Bump first so any in-flight fetch from a prior period can no longer apply,
    // even when this run resolves synchronously from cache.
    const sequence = ++fetchSequence.current;
    const cached = cacheRef.current.get(`${generation}:${period}`);
    if (cached) {
      setRing(cached);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadPeriod(period).then(
      (loaded) => {
        if (sequence !== fetchSequence.current) return;
        setRing(loaded);
        setError(null);
        setIsLoading(false);
      },
      (cause: unknown) => {
        if (sequence !== fetchSequence.current) return;
        setError(cause instanceof Error ? cause.message : 'Something went wrong.');
        setIsLoading(false);
      },
    );
  }, [generation, period, loadPeriod]);

  // Warm the other periods in the background so the first switch is instant too.
  useEffect(() => {
    const timer = setTimeout(() => {
      for (const { value } of PERIODS) {
        if (value !== period) loadPeriod(value).catch(() => {});
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [generation, period, loadPeriod]);

  useEffect(() => {
    if (!activeSlice) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveSlice(null);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [activeSlice]);

  const segments = ring?.segments ?? [];
  const isEmpty = segments.length === 0;
  const forgotten = segments.find(
    (segment): segment is Extract<RingSegmentView, { kind: 'forgotten' }> =>
      segment.kind === 'forgotten',
  );

  const handleForgottenSelect = (segment: Extract<RingSegmentView, { kind: 'forgotten' }>) => {
    if (segment.slices.length === 1) setActiveSlice(segment.slices[0]);
  };

  return (
    <section aria-label="Living Ring" className="mb-10 flex flex-col items-center">
      <div
        role="group"
        aria-label="Time period"
        className="mb-6 flex gap-1 rounded-full border border-line bg-card p-1"
      >
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={period === value}
            onClick={() => {
              setActiveSlice(null);
              setHoveredKey(null);
              setPeriod(value);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              period === value
                ? 'bg-accent-soft text-accent'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-accent">
          {error}
        </p>
      )}

      <div
        className={`relative w-full transition-opacity duration-300 ${
          isLoading ? 'opacity-50' : 'opacity-100'
        }`}
        aria-busy={isLoading}
      >
        <LivingRing
          segments={segments}
          layout={ring?.layout ?? 'aggregate'}
          centerTitle={isEmpty ? 'Unwritten' : formatMinutes(ring?.rememberedMinutes ?? 0)}
          centerSubtitle={
            isEmpty
              ? 'this part of your story is still waiting'
              : REMEMBERED_SUBTITLES[period]
          }
          hoveredKey={hoveredKey}
          onHoverKey={setHoveredKey}
          revealKey={`${period}:${refreshToken}`}
          onForgottenSelect={period === 'today' ? handleForgottenSelect : undefined}
          onForgottenNavigate={
            period !== 'today'
              ? () => {
                  setPeriod('today');
                  onShowStory();
                }
              : undefined
          }
        />

        {activeSlice && (
          <>
            {/* Tap outside to dismiss — leaving is always a fine answer (§5.2.2). */}
            <button
              type="button"
              aria-label="Close"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setActiveSlice(null)}
            />
            <div
              role="dialog"
              aria-label={gapFillQuestion(activeSlice.startLabel, activeSlice.endLabel)}
              className="absolute left-1/2 top-1/2 z-20 w-full max-w-sm -translate-x-1/2 -translate-y-1/3 rounded-xl border border-question-line bg-card p-4 shadow-lg"
            >
              <p className="font-display text-lg text-question">
                {gapFillQuestion(activeSlice.startLabel, activeSlice.endLabel)}
              </p>
              <p className="mt-1 text-xs text-muted">{gapFillHint()}</p>
              <GapFillForm
                gap={toGapView(activeSlice)}
                localDate={activeSlice.localDate}
                timezone={timezone}
                onDone={() => {
                  setActiveSlice(null);
                  onChanged();
                }}
                onCancel={() => setActiveSlice(null)}
              />
            </div>
          </>
        )}
      </div>

      {period !== 'today' && forgotten && (
        <p className="mt-5 max-w-sm text-center text-sm text-muted">
          {aggregateForgottenLead(forgotten.slices.length)}
        </p>
      )}

      {!isEmpty && (
        <ul className="mt-6 grid w-full grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-2">
          {segments.map((segment, index) => {
            const key = segmentKey(segment, index);
            return (
              <li
                key={key}
                onPointerEnter={() => setHoveredKey(key)}
                onPointerLeave={() => setHoveredKey(null)}
                className={`flex min-w-0 items-center gap-2 rounded-md px-1 -mx-1 text-sm transition-colors duration-150 ${
                  hoveredKey === key ? 'bg-line/40' : ''
                }`}
              >
                <LegendSwatch segment={segment} />
                {segment.startLabel && (
                  <span className="shrink-0 tabular-nums text-xs text-muted">
                    {segment.startLabel}
                  </span>
                )}
                <span className="truncate">{segmentLabel(segment)}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">
                  {formatMinutes(segment.durationMinutes)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function LegendSwatch({ segment }: { segment: RingSegmentView }) {
  const color = segmentColor(segment);
  // Dotted vs. dashed mirrors the ring's own texture distinction: unremembered
  // is answered and settled, forgotten is still open — never just a color cue.
  if (segment.kind === 'unremembered') {
    return (
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full opacity-70"
        style={{ border: `1.5px dotted ${color}` }}
      />
    );
  }
  if (segment.kind === 'forgotten') {
    return (
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ border: `1.5px dashed ${color}` }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function toGapView(slice: ForgottenSliceView): GapView {
  return {
    startAt: slice.startAt,
    endAt: slice.endAt,
    durationMinutes: slice.durationMinutes,
    kind: 'forgotten-moment',
    startLabel: slice.startLabel,
    endLabel: slice.endLabel,
  };
}
