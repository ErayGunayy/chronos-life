/**
 * Home Experience domain types (CLAUDE.md §5.8).
 */

/**
 * The user's usual sleep window (§5.8.4), stated once and editable any time.
 * Local wall-clock HH:MM; `start` after `end` means it crosses midnight
 * (the common case, e.g. 23:00–07:00).
 *
 * v0 note: the window is counted as remembered time when computing Today's
 * Progress — it is *not* yet materialized as a per-day LifeEvent. Deriving it
 * keeps facts purely user-authored; promoting sleep to real, editable
 * LifeEvents (per §5.8.4 path 1) is the recorded follow-up, and §8's gap
 * scope must be revisited when that lands.
 */
export interface SleepWindow {
  readonly start: string;
  readonly end: string;
}

const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidSleepWindow(window: SleepWindow): boolean {
  return (
    LOCAL_TIME_PATTERN.test(window.start) &&
    LOCAL_TIME_PATTERN.test(window.end) &&
    window.start !== window.end
  );
}

/** Minutes the window covers, handling midnight crossing (23:00–07:00 → 480). */
export function sleepWindowMinutes(window: SleepWindow): number {
  const toMinutes = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };
  const start = toMinutes(window.start);
  const end = toMinutes(window.end);
  return end > start ? end - start : 24 * 60 - start + end;
}
