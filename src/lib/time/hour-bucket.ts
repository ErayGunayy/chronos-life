/**
 * Hour-of-day bucketing for pattern identity (CLAUDE.md §6.6): patterns are
 * keyed by which part of the local day keeps going unremembered, never by
 * weekday.
 */
export function hourOfDayBucket(instantIso: string, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(instantIso)),
  );
}
