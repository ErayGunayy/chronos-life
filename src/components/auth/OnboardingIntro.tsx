'use client';

import { useState } from 'react';

import { primaryButton, quietButton } from '@/components/today/ui';

type Slide = {
  readonly title: string;
  readonly body: string;
};

/**
 * First-visit intro (§1, §5.4, §6.4, §5.11): what Chronos is, before any ask.
 * Tone follows §5.5 — observe, never instruct; warm, never corporate.
 */
const SLIDES: readonly Slide[] = [
  {
    title: 'Your second memory',
    body: "Chronos remembers what you choose to tell it — so when you forget, it's the first place to look.",
  },
  {
    title: "Tell your day, don't log it",
    body: 'Speak or write it naturally. Chronos turns your story into a timeline — never the other way around.',
  },
  {
    title: 'Forgotten time is the point, not the problem',
    body: "When something's missing from your story, Chronos gently notices — and “I don't remember” is always a complete answer.",
  },
  {
    title: 'Yours, always',
    body: 'Export or delete everything, any time. Chronos never judges a day — it just helps you see it.',
  },
];

export function OnboardingIntro({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="font-display text-xl tracking-tight text-accent">Chronos</p>

      {/* Keyed so the gentle reveal replays per slide — same motion the ring uses. */}
      <div key={index} className="ring-reveal mt-8 flex min-h-40 flex-col items-center">
        <h1 className="font-display max-w-md text-3xl sm:text-4xl">{slide.title}</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted">{slide.body}</p>
      </div>

      <div className="mt-6 flex items-center gap-2" aria-hidden>
        {SLIDES.map((_, dot) => (
          <span
            key={dot}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              dot === index ? 'bg-accent' : 'bg-line'
            }`}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button type="button" onClick={onDone} className={quietButton}>
          Skip
        </button>
        <button
          type="button"
          onClick={() => (isLast ? onDone() : setIndex(index + 1))}
          className={primaryButton}
        >
          {isLast ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
