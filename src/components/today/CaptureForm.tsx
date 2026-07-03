'use client';

import { useState } from 'react';

import type { CaptureResponse } from '@/app/api/capture/handler';
import { extractStory } from '@/components/today/api';
import { ghostButton, primaryButton } from '@/components/today/ui';

type Props = {
  localDate: string;
  timezone: string;
  onExtracted: (response: CaptureResponse) => void;
  onCancel?: () => void;
};

export function CaptureForm({ localDate, timezone, onExtracted, onCancel }: Props) {
  const [narrative, setNarrative] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (narrative.trim() === '' || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      onExtracted(await extractStory(narrative, localDate, timezone));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl">Tell today&apos;s story</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted">
          Just talk about your day — where it started, what happened, who was there.
          Chronos listens and proposes memories. Nothing is saved without your OK.
        </p>
      </div>

      <textarea
        value={narrative}
        onChange={(event) => setNarrative(event.target.value)}
        rows={9}
        autoFocus
        placeholder="This morning I…"
        aria-label="The story of your day"
        className="w-full resize-y rounded-xl border border-line bg-card px-4 py-3 text-base leading-7 text-foreground shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none"
      />

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isBusy || narrative.trim() === ''} className={primaryButton}>
          {isBusy ? 'Listening…' : 'Listen to my story'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={ghostButton}>
            Back to today
          </button>
        )}
      </div>

      <p className="text-xs leading-5 text-muted/80">
        Without an AI key configured, Chronos reads plain lines like
        {' '}
        <code className="rounded bg-card px-1 py-0.5 font-mono">
          09:00-10:30 Coffee with Sarah at Kadıköy #Social
        </code>
        .
      </p>
    </form>
  );
}
