/*
 * Minimal ambient types for the browser Web Speech API (SpeechRecognition).
 * It's non-standard and not reliably present in TypeScript's DOM lib, so we
 * declare only the slice the voice-capture hook uses. Names are suffixed
 * `Like` to avoid colliding with any built-in lib.dom declarations.
 *
 * The constructor is read off `window` via a cast in useSpeechRecognition.ts,
 * so we deliberately do NOT augment the global `Window` interface here (that
 * risks clashing with a future lib.dom definition).
 */

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;
