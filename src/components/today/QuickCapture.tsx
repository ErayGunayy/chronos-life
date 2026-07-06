'use client';

import { useState } from 'react';

import type { CaptureResponse } from '@/app/api/capture/handler';
import { extractStory } from '@/components/today/api';
import { MicButton } from '@/components/today/MicButton';
import { appendTranscript } from '@/components/today/transcript';
import { primaryButton } from '@/components/today/ui';
import { useSpeechRecognition } from '@/components/today/useSpeechRecognition';

type Props = {
  localDate: string;
  timezone: string;
  onExtracted: (response: CaptureResponse) => void;
};

/**
 * Voice-first "add one moment" surface for the story view (§5.8 Quick Capture).
 * A short line — spoken or typed — goes through the same AI extraction as the
 * full story and hands the candidates up for the normal review step, tagged as
 * a quick add. It never persists on its own (nothing AI-extracted skips review).
 */
export function QuickCapture({ localDate, timezone, onExtracted }: Props) {
  const [text, setText] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeechRecognition({
    onFinalSegment: (segment) => setText((prev) => appendTranscript(prev, segment)),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (value === '' || isBusy) return;
    if (speech.isListening) speech.stop();
    setIsBusy(true);
    setError(null);
    try {
      const response = await extractStory(value, localDate, timezone);
      setText('');
      onExtracted(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="mt-10 rounded-2xl border border-line bg-card/60 p-5">
      <h2 className="font-display text-xl">Add a moment</h2>
      <p className="mt-1 text-sm text-muted">
        {speech.isSupported
          ? 'Tap the mic and just say it — or type instead.'
          : 'Jot down one thing that happened.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3">
        {speech.isSupported && (
          <MicButton isListening={speech.isListening} onToggle={speech.toggle} />
        )}
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={speech.isListening ? 'Listening…' : 'e.g. Coffee with Sarah for an hour'}
          aria-label="Add a quick moment"
          className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-2.5 text-base text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none"
        />
        <button type="submit" disabled={isBusy || text.trim() === ''} className={primaryButton}>
          {isBusy ? 'Reading…' : 'Add'}
        </button>
      </form>

      {speech.isListening && speech.interimText && (
        <p className="mt-2 text-sm italic text-muted">{speech.interimText}</p>
      )}

      {(error || speech.error) && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {error ?? speech.error}
        </p>
      )}

      {speech.isSupported && (
        <p className="mt-3 text-xs leading-5 text-muted/80">
          Voice uses your browser&apos;s speech recognition, so the audio may be sent to your
          browser&apos;s maker to turn it into text.
        </p>
      )}
    </section>
  );
}
