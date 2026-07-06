'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { resolveSpeechLang } from '@/components/today/transcript';

type Options = {
  /** Called with each finalized phrase as the user speaks. */
  readonly onFinalSegment: (segment: string) => void;
  /** Override the recognition language; defaults to the browser locale. */
  readonly lang?: string;
};

export type SpeechRecognitionController = {
  /** Whether this browser exposes the Web Speech API at all. */
  readonly isSupported: boolean;
  readonly isListening: boolean;
  /** The not-yet-final phrase, for a live on-screen hint. */
  readonly interimText: string;
  readonly error: string | null;
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: () => void;
};

function getRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

// Support never changes for a page, so the store never notifies — subscribe is
// a no-op returning an empty unsubscribe.
function subscribeSupport(): () => void {
  return () => {};
}

/** Non-judgmental, plain-language messages for the recognition error codes. */
function describeSpeechError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is off — you can turn it on in your browser settings.';
    case 'no-speech':
      return "I didn't catch anything that time — try again when you're ready.";
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return "Voice needs a connection right now and couldn't reach it.";
    default:
      return 'Voice input stopped unexpectedly — please try again.';
  }
}

/**
 * Wraps the browser Web Speech API as dictation: each finalized phrase is
 * handed to `onFinalSegment` (the caller owns the text field), while interim
 * words surface via `interimText` for a live hint. Support is detected after
 * mount to avoid an SSR/client hydration mismatch.
 */
export function useSpeechRecognition({ onFinalSegment, lang }: Options): SpeechRecognitionController {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Read Web Speech support via an external-store snapshot: correct on the
  // client without an SSR/hydration mismatch or a setState-in-effect.
  const isSupported = useSyncExternalStore(
    subscribeSupport,
    () => getRecognitionConstructor() !== null,
    () => false,
  );

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Keep the latest callback without re-creating `start`, so the recognition
  // instance always reports to the current handler (no stale closure).
  const onFinalSegmentRef = useRef(onFinalSegment);
  useEffect(() => {
    onFinalSegmentRef.current = onFinalSegment;
  });

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText('');
  }, []);

  const start = useCallback(() => {
    if (recognitionRef.current) return;
    const RecognitionCtor = getRecognitionConstructor();
    if (!RecognitionCtor) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang =
      lang ?? resolveSpeechLang(typeof navigator !== 'undefined' ? navigator.language : undefined);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          const finalized = text.trim();
          if (finalized !== '') onFinalSegmentRef.current(finalized);
        } else {
          interim += text;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      setError(describeSpeechError(event.error));
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    setError(null);
    setInterimText('');
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setError('Could not start voice input — please try again.');
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  return { isSupported, isListening, interimText, error, start, stop, toggle };
}
