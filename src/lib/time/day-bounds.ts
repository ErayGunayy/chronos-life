/**
 * Local-day → UTC range conversion for the v0 time model (CLAUDE.md §8):
 * a "day" is the user's local calendar day in their IANA timezone.
 */

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_OFFSET_CONVERGENCE_PASSES = 3;

export interface DayBounds {
  /** UTC instant of local midnight starting the day (inclusive). */
  readonly fromUtc: string;
  /** UTC instant of the next local midnight (exclusive). */
  readonly toUtc: string;
}

export function dayBoundsUtc(localDate: string, timeZone: string): DayBounds {
  return {
    fromUtc: utcInstantOfLocalMidnight(localDate, timeZone),
    toUtc: utcInstantOfLocalMidnight(nextLocalDate(localDate), timeZone),
  };
}

/**
 * Finds the UTC instant at which the given timezone's wall clock reads
 * 00:00 on `localDate`. Iterative offset correction so DST transitions
 * (23- and 25-hour days) resolve to the true local midnight.
 */
export function utcInstantOfLocalMidnight(localDate: string, timeZone: string): string {
  return utcInstantOfLocalWallClock(localDate, 0, 0, timeZone);
}

const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** UTC instant at which the timezone's wall clock reads `HH:MM` on `localDate`. */
export function utcInstantAtLocalTime(
  localDate: string,
  localTime: string,
  timeZone: string,
): string {
  const match = LOCAL_TIME_PATTERN.exec(localTime);
  if (!match) {
    throw new RangeError(`local time must be HH:MM (00:00–23:59), got: ${localTime}`);
  }
  return utcInstantOfLocalWallClock(localDate, Number(match[1]), Number(match[2]), timeZone);
}

function utcInstantOfLocalWallClock(
  localDate: string,
  hour: number,
  minute: number,
  timeZone: string,
): string {
  if (!LOCAL_DATE_PATTERN.test(localDate)) {
    throw new RangeError(`localDate must be YYYY-MM-DD, got: ${localDate}`);
  }
  const [year, month, day] = localDate.split('-').map(Number);
  const targetWallMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  let guessMs = targetWallMs;
  for (let pass = 0; pass < MAX_OFFSET_CONVERGENCE_PASSES; pass += 1) {
    const wallMs = wallClockAsUtcMs(guessMs, timeZone);
    const drift = wallMs - targetWallMs;
    if (drift === 0) break;
    guessMs -= drift;
  }
  return new Date(guessMs).toISOString();
}

/** Reads the wall-clock date/time an instant shows in a timezone, as UTC ms. */
function wallClockAsUtcMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instantMs));

  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new RangeError(`missing ${type} part while reading wall clock`);
    return Number(part.value);
  };

  return Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'));
}

/** The local calendar date one day after `localDate` (handles month/year rollover). */
export function nextLocalDate(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}
