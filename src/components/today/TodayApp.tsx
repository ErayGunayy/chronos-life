'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CaptureResponse } from '@/app/api/capture/handler';
import type { DayResponse } from '@/app/api/day/handler';
import { fetchDay } from '@/components/today/api';
import { CaptureForm } from '@/components/today/CaptureForm';
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
  const [error, setError] = useState<string | null>(null);

  const refreshDay = useCallback(
    async (nextView?: View) => {
      try {
        const loaded = await fetchDay(localDate, timezone);
        setDay(loaded);
        setError(null);
        setView(nextView ?? (loaded.segments.length === 0 ? 'capture' : 'story'));
      } catch (cause) {
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

  const handleExtracted = (response: CaptureResponse) => {
    setReview(response);
    setView('review');
  };

  const handleCommitted = () => {
    setReview(null);
    void refreshDay('story');
  };

  const hasStory = (day?.segments.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 sm:py-14">
      <header className="mb-10 flex items-baseline justify-between gap-4">
        <div>
          <p className="font-display text-xl tracking-tight text-accent">Chronos</p>
          <h1 className="font-display mt-1 text-3xl text-foreground sm:text-4xl">
            {formatDateHeading(localDate)}
          </h1>
        </div>
        <nav aria-label="Your memories" className="text-right text-xs text-muted">
          <p className="mb-1">Your memories are yours:</p>
          <p>
            <a className="underline decoration-line underline-offset-2 hover:text-accent" href="/api/export?format=markdown">
              export Markdown
            </a>
            {' · '}
            <a className="underline decoration-line underline-offset-2 hover:text-accent" href="/api/export?format=json">
              JSON
            </a>
          </p>
        </nav>
      </header>

      {error && (
        <p role="alert" className="mb-6 rounded-lg border border-accent-soft bg-accent-soft/50 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {view === 'loading' && <p className="text-sm text-muted">Opening today…</p>}

      {view === 'capture' && (
        <CaptureForm
          localDate={localDate}
          timezone={timezone}
          onExtracted={handleExtracted}
          onCancel={hasStory ? () => setView('story') : undefined}
        />
      )}

      {view === 'review' && review && (
        <ReviewList
          response={review}
          localDate={localDate}
          timezone={timezone}
          onCommitted={handleCommitted}
          onBack={() => setView('capture')}
        />
      )}

      {view === 'story' && day && (
        <StoryView
          day={day}
          localDate={localDate}
          timezone={timezone}
          onContinue={() => setView('capture')}
          onChanged={() => void refreshDay('story')}
        />
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
