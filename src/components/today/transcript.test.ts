import { describe, expect, it } from 'vitest';

import { appendTranscript, resolveSpeechLang } from '@/components/today/transcript';

describe('appendTranscript', () => {
  it('returns the segment alone when the existing text is empty', () => {
    expect(appendTranscript('', 'Gym for an hour')).toBe('Gym for an hour');
  });

  it('inserts a single space between existing text and the new segment', () => {
    expect(appendTranscript('Gym for an hour', 'then lunch')).toBe('Gym for an hour then lunch');
  });

  it('does not add a second space when the existing text already ends in one', () => {
    expect(appendTranscript('Gym for an hour ', 'then lunch')).toBe('Gym for an hour then lunch');
  });

  it('trims the incoming segment before appending', () => {
    expect(appendTranscript('Morning run', '  then coffee  ')).toBe('Morning run then coffee');
  });

  it('leaves the existing text unchanged for an empty or whitespace-only segment', () => {
    expect(appendTranscript('Morning run', '   ')).toBe('Morning run');
    expect(appendTranscript('Morning run', '')).toBe('Morning run');
  });
});

describe('resolveSpeechLang', () => {
  it('uses the browser locale when one is reported', () => {
    expect(resolveSpeechLang('tr-TR')).toBe('tr-TR');
  });

  it('falls back to en-US when the locale is missing or blank', () => {
    expect(resolveSpeechLang(undefined)).toBe('en-US');
    expect(resolveSpeechLang('   ')).toBe('en-US');
  });
});
