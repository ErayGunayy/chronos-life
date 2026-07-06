'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CaptureResponse } from '@/app/api/capture/handler';
import type { DayResponse } from '@/app/api/day/handler';
import { RingSection } from '@/components/ring/RingSection';
import { fetchDay, type MemoryCommitItem } from '@/components/today/api';
import { CaptureForm } from '@/components/today/CaptureForm';
import { QuickCapture } from '@/components/today/QuickCapture';
import { ReviewList } from '@/components/today/ReviewList';
import { StoryView } from '@/components/today/StoryView';

type View = 'loading' | 'capture' | 'review' | 'story';

export function TodayApp() {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );
  const localDate = useMemo(() => todayLocalDate(timezone), [timezone]);

  const [view, setView] = useState<View>('loading');
  const [day, setDay] = useState<DayResponse | null>(null);
  const [review, setReview] = useState<CaptureResponse | null>(null);
  const [reviewSource, setReviewSource] = useState<MemoryCommitItem['source']>('life-conversation');
  const [error, setError] = useState<string | null>(null);
  // Bumped on every day (re)load so the ring refetches alongside the story.
  const [dayVersion, setDayVersion] = useState(0);
  const storyRef = useRef<HTMLDivElement | null>(null);

  // Latest-wins guard: overlapping refreshes must not let a stale day
  // overwrite a fresher one.
  const refreshSequence = useRef(0);

  const refreshDay = useCallback(
    async (nextView?: View) => {
      const sequence = ++refreshSequence.current;
      try {
        const loaded = await fetchDay(localDate, timezone);
        if (sequence !== refreshSequence.current) return;
        setDay(loaded);
        setDayVersion((version) => version + 1);
        setError(null);
        setView(nextView ?? (loaded.segments.length === 0 ? 'capture' : 'story'));
      } catch (cause) {
        if (sequence !== refreshSequence.current) return;
        setError(cause instanceof Error ? cause.message : 'Something went wrong.');
        setView('capture');
      }
    },
    [localDate, timezone],
  );

  useEffect(() => {
    let isCancelled = false;
    fetchDay(localDate, timezone).then(
      (loaded) => {
        if (isCancelled) return;
        setDay(loaded);
        setView(loaded.segments.length === 0 ? 'capture' : 'story');
      },
      (cause: unknown) => {
        if (isCancelled) return;
        setError(cause instanceof Error ? cause.message : 'Something went wrong.');
        setView('capture');
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [localDate, timezone]);

  const handleShowStory = useCallback(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    storyRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const handleExtracted = (response: CaptureResponse, source: MemoryCommitItem['source']) => {
    setReview(response);
    setReviewSource(source);
    setView('review');
  };

  const handleCommitted = () => {
    setReview(null);
    void refreshDay('story');
  };

  const hasStory = (day?.segments.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 sm:py-14 lg:max-w-6xl">
      <header className="mb-10 flex items-baseline justify-between gap-4">
        <div>
          <p className="font-display text-xl tracking-tight text-accent">Chronos</p>
          <h1 className="font-display mt-1 text-3xl text-foreground sm:text-4xl">
            {formatDateHeading(localDate)}
          </h1>
        </div>
        <nav aria-label="Chronos" className="text-right text-xs text-muted">
          <p className="mb-1">
            <Link
              className="underline decoration-line underline-offset-2 hover:text-accent"
              href="/reflections/weekly"
            >
              This week
            </Link>
          </p>
          <p className="mb-1">
            <a className="underline decoration-line underline-offset-2 hover:text-accent" href="/api/export?format=markdown">
              export Markdown
            </a>
            {' · '}
            <a className="underline decoration-line underline-offset-2 hover:text-accent" href="/api/export?format=json">
              JSON
            </a>
          </p>
          <p>
            <Link
              className="underline decoration-line underline-offset-2 hover:text-accent"
              href="/settings"
            >
              Settings
            </Link>
          </p>
        </nav>
      </header>

      {error && (
        <p role="alert" className="mb-6 rounded-lg border border-accent-soft bg-accent-soft/50 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {view === 'loading' && (
        <p className="mx-auto w-full max-w-2xl text-sm text-muted">Opening today…</p>
      )}

      {/* Capture and review stay a readable narrow column even on wide screens. */}
      {view === 'capture' && (
        <div className="mx-auto w-full max-w-2xl">
          <CaptureForm
            localDate={localDate}
            timezone={timezone}
            onExtracted={(response) => handleExtracted(response, 'life-conversation')}
            onCancel={hasStory ? () => setView('story') : undefined}
          />
        </div>
      )}

      {view === 'review' && review && (
        <div className="mx-auto w-full max-w-2xl">
          <ReviewList
            response={review}
            localDate={localDate}
            timezone={timezone}
            source={reviewSource}
            onCommitted={handleCommitted}
            onBack={() => setView('capture')}
          />
        </div>
      )}

      {view === 'story' && day && (
        <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-10">
          {/* Desktop (lg+): ring left, story + quick capture right; mobile stays stacked. */}
          {/* The Living Ring always comes first (§5.8); sticky beside the story on desktop. */}
          <div className="lg:sticky lg:top-8">
            <RingSection
              localDate={localDate}
              timezone={timezone}
              refreshToken={dayVersion}
              onChanged={() => void refreshDay('story')}
              onShowStory={handleShowStory}
            />
          </div>
          <div>
            <div ref={storyRef}>
              <StoryView
                day={day}
                localDate={localDate}
                timezone={timezone}
                onContinue={() => setView('capture')}
                onChanged={() => void refreshDay('story')}
              />
            </div>
            {/* Quick Capture sits after the day's value is on screen (§5.8). */}
            <QuickCapture
              localDate={localDate}
              timezone={timezone}
              onExtracted={(response) => handleExtracted(response, 'quick-add')}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function todayLocalDate(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatDateHeading(localDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${localDate}T12:00:00`));
}
