'use client';

type Props = {
  isListening: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * Voice-capture toggle. Idle: a quiet outlined mic. Listening: filled accent
 * with a slow pulse (`mic-pulse`, calm-motion per §5.2 / §5.8.3). The caller
 * only renders this when voice is actually supported.
 */
export function MicButton({ isListening, onToggle, className }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isListening}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isListening
          ? 'mic-pulse border-accent bg-accent text-accent-ink'
          : 'border-line bg-card text-muted hover:border-accent hover:text-accent'
      } ${className ?? ''}`}
    >
      <MicGlyph />
      {isListening && <span className="sr-only">Listening…</span>}
    </button>
  );
}

function MicGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  );
}
