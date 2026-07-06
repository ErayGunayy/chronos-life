/**
 * Pure text helpers shared by the voice-capture surfaces. Kept free of React
 * and browser globals so the spacing and language-fallback rules can be unit
 * tested on their own (the hook that uses them is browser-coupled).
 */

/**
 * Appends a freshly finalized speech segment to whatever text is already in the
 * field, inserting a single separating space only when the existing text
 * doesn't already end in whitespace. Empty segments leave the text untouched.
 */
export function appendTranscript(existing: string, segment: string): string {
  const trimmedSegment = segment.trim();
  if (trimmedSegment === '') return existing;
  if (existing === '') return trimmedSegment;
  const endsWithSpace = /\s$/.test(existing);
  return `${existing}${endsWithSpace ? '' : ' '}${trimmedSegment}`;
}

/**
 * The BCP-47 language tag recognition should run in. Defaults to the browser's
 * own locale so a Turkish narrator is transcribed in Turkish with no config,
 * falling back to US English when the browser reports nothing usable.
 */
export function resolveSpeechLang(navigatorLanguage: string | undefined): string {
  const lang = navigatorLanguage?.trim();
  return lang && lang.length > 0 ? lang : 'en-US';
}
