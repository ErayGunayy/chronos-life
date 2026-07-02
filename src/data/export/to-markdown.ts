import type { LifeEvent } from '@/domain/life-event/types';
import { localDateOf, localTimeOf } from '@/lib/time/format';

/**
 * Markdown export — the human-durable format (CLAUDE.md §5.11): a person
 * should be able to read their life back decades from now with any text
 * editor, no Chronos required. Facts only; tone stays neutral everywhere.
 */
export function toMarkdownExport(
  events: readonly LifeEvent[],
  opts: { exportedAt: string },
): string {
  const byDay = new Map<string, LifeEvent[]>();
  for (const event of events) {
    const day = localDateOf(event.startAt, event.timezone);
    const existing = byDay.get(day) ?? [];
    byDay.set(day, [...existing, event]);
  }

  const lines: string[] = [
    '# Chronos — your memories',
    '',
    `Exported at ${opts.exportedAt}. All times are local to where each memory happened.`,
    '',
  ];

  for (const day of [...byDay.keys()].sort()) {
    lines.push(`## ${day}`, '');
    const dayEvents = [...(byDay.get(day) ?? [])].sort(
      (a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id),
    );

    for (const event of dayEvents) {
      lines.push(...renderEvent(event), '');
    }
  }

  return lines.join('\n');
}

function renderEvent(event: LifeEvent): string[] {
  const start = localTimeOf(event.startAt, event.timezone);
  const end = localTimeOf(event.endAt, event.timezone);
  const title = event.kind === 'unremembered' ? 'Unremembered time' : event.title;
  const lines = [`### ${start}–${end} — ${title}`];

  if (event.kind === 'unremembered') {
    lines.push('', '_Recorded as not remembered — it can always be filled in later._');
  }
  if (event.category) lines.push('', `- Category: ${event.category}`);
  if (event.people.length > 0) lines.push(`- People: ${event.people.join(', ')}`);
  if (event.place) lines.push(`- Place: ${event.place}`);
  if (event.description) lines.push('', event.description);
  if (event.notes) lines.push('', event.notes);

  return lines;
}
