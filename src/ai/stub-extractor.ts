import type { LifeEventExtractor } from '@/ai/life-event-extractor';
import type {
  CandidateEvent,
  ExtractionRequest,
  ExtractionResult,
} from '@/domain/capture/types';

const LINE_PATTERN = /^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s+(.+)$/;
const CATEGORY_PATTERN = /\s#(\S[^#]*)$/;
const STUB_CATEGORY_CONFIDENCE = 0.9;

/**
 * Deterministic extractor for tests and keyless dev runs — NOT AI. It parses
 * one strict line format:
 *
 *   HH:MM-HH:MM What happened [with A, B and C] [at Place] [#Category]
 *
 * Anything else is skipped and mentioned in the note, so flows stay honest
 * about what was and wasn't captured.
 */
export class StubExtractor implements LifeEventExtractor {
  readonly kind = 'stub' as const;

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    const lines = request.narrative
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return {
        candidates: [],
        note: 'Nothing to read yet — describe a moment as "HH:MM-HH:MM What happened".',
      };
    }

    const candidates: CandidateEvent[] = [];
    let skipped = 0;

    for (const line of lines) {
      const candidate = parseLine(line);
      if (candidate) {
        candidates.push(candidate);
      } else {
        skipped += 1;
      }
    }

    const sorted = [...candidates].sort((a, b) =>
      a.startLocalTime.localeCompare(b.startLocalTime),
    );

    return {
      candidates: sorted,
      note:
        skipped > 0
          ? `I couldn't read ${skipped} line(s) — the stub only understands "HH:MM-HH:MM What happened [with People] [at Place] [#Category]".`
          : null,
    };
  }
}

function parseLine(line: string): CandidateEvent | null {
  const match = LINE_PATTERN.exec(line);
  if (!match) return null;

  const startLocalTime = toPaddedTime(match[1], match[2]);
  const endLocalTime = toPaddedTime(match[3], match[4]);
  if (!startLocalTime || !endLocalTime) return null;

  let rest = match[5].trim();

  let category: string | null = null;
  const categoryMatch = CATEGORY_PATTERN.exec(rest);
  if (categoryMatch) {
    category = categoryMatch[1].trim();
    rest = rest.slice(0, categoryMatch.index).trim();
  }

  let people: string[] = [];
  let place: string | null = null;

  const withIndex = rest.indexOf(' with ');
  if (withIndex >= 0) {
    let peoplePart = rest.slice(withIndex + ' with '.length);
    rest = rest.slice(0, withIndex);

    const atIndex = peoplePart.indexOf(' at ');
    if (atIndex >= 0) {
      place = peoplePart.slice(atIndex + ' at '.length).trim() || null;
      peoplePart = peoplePart.slice(0, atIndex);
    }
    people = peoplePart
      .split(/,|\band\b/)
      .map((person) => person.trim())
      .filter((person) => person.length > 0);
  } else {
    const atIndex = rest.indexOf(' at ');
    if (atIndex >= 0) {
      place = rest.slice(atIndex + ' at '.length).trim() || null;
      rest = rest.slice(0, atIndex);
    }
  }

  const title = rest.trim();
  if (title === '') return null;

  return {
    title,
    description: null,
    category,
    categoryConfidence: category ? STUB_CATEGORY_CONFIDENCE : null,
    startLocalTime,
    endLocalTime,
    timeConfidence: 1,
    people,
    place,
  };
}

function toPaddedTime(hours: string, minutes: string): string | null {
  const h = Number(hours);
  const m = Number(minutes);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
