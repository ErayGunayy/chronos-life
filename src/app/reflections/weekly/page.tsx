import Link from 'next/link';

import { getRepository } from '@/data/get-repository';
import {
  firstWeekMessage,
  quietWeekMessage,
  weeklyPatternObservation,
} from '@/domain/patterns/copy';
import {
  WEEKLY_PATTERN_MIN_DAYS,
  summarizeDayGaps,
  weeklyPatterns,
  type DayGapSummary,
} from '@/domain/patterns/engine';
import { DEV_USER_ID } from '@/lib/dev-user';
import { dayBoundsUtc } from '@/lib/time/day-bounds';

export const dynamic = 'force-dynamic';

/**
 * The weekly reflection view — the only place weekly patterns surface
 * (§6.6): a looking-back moment, never mid-capture. Single-user v0 runs
 * where the person runs the server, so the server timezone is theirs.
 */
export default async function WeeklyReflectionPage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const repository = getRepository();

  const summaries: DayGapSummary[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const localDate = localDateDaysAgo(offset, timezone);
    const bounds = dayBoundsUtc(localDate, timezone);
    const events = await repository.listBetween(DEV_USER_ID, bounds.fromUtc, bounds.toUtc);
    if (events.length > 0) {
      summaries.push(summarizeDayGaps(localDate, events, timezone));
    }
  }

  const patterns = weeklyPatterns(summaries);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 sm:py-14">
      <header className="mb-10">
        <Link href="/" className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-accent">
          ← Today
        </Link>
        <p className="font-display mt-4 text-xl tracking-tight text-accent">Chronos</p>
        <h1 className="font-display mt-1 text-3xl sm:text-4xl">This week, looking back</h1>
      </header>

      {summaries.length < WEEKLY_PATTERN_MIN_DAYS ? (
        <section className="rounded-xl border border-line bg-card p-5">
          <p className="text-base leading-7">{firstWeekMessage()}</p>
          <p className="mt-3 text-sm text-muted">
            {summaries.length} of {WEEKLY_PATTERN_MIN_DAYS} days have a story so far.
          </p>
        </section>
      ) : patterns.length === 0 ? (
        <section className="rounded-xl border border-line bg-card p-5">
          <p className="text-base leading-7">{quietWeekMessage()}</p>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          {patterns.map((pattern) => (
            <article
              key={pattern.bucket}
              className="rounded-xl border border-question-line bg-question-bg/60 p-5"
            >
              <p className="text-base leading-7">{weeklyPatternObservation(pattern)}</p>
              <p className="mt-3 text-xs text-question/80">
                Unwritten on {Math.round(pattern.share * 100)}% of the days you told —
                an observation, not a verdict.
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function localDateDaysAgo(offset: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() - offset * 86_400_000));
}
