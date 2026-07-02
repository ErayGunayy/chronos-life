/**
 * Timezone-aware formatting over the v0 time model (CLAUDE.md §8):
 * instants are stored in UTC; a "day" is the user's local calendar day.
 */

/** Local calendar date (YYYY-MM-DD) of a UTC instant in an IANA timezone. */
export function localDateOf(instantIso: string, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instantIso));
}

/** Local wall-clock time (HH:MM, 24-hour) of a UTC instant in an IANA timezone. */
export function localTimeOf(instantIso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instantIso));
}
