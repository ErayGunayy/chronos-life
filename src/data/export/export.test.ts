import { describe, expect, test } from 'vitest';

import { createLifeEvent } from '@/domain/life-event/factory';
import { parseJsonExport, toJsonExport } from '@/data/export/to-json';
import { toMarkdownExport } from '@/data/export/to-markdown';

const deps = { id: () => 'event-1', now: () => '2026-07-02T19:00:00.000Z' };
const EXPORTED_AT = '2026-07-02T21:00:00.000Z';

const coffee = createLifeEvent(
  {
    userId: 'user-1',
    title: 'Coffee with Sarah',
    description: 'Long overdue catch-up.',
    category: 'Social',
    categoryConfidence: 0.9,
    startAt: '2026-07-02T06:00:00.000Z',
    endAt: '2026-07-02T07:30:00.000Z',
    timezone: 'Europe/Istanbul',
    source: 'life-conversation',
    people: ['Sarah'],
    place: 'Kadıköy',
    notes: 'She got the new job!',
  },
  deps,
);

const lateNight = createLifeEvent(
  {
    userId: 'user-1',
    title: 'Reading before bed',
    // 22:30 UTC on 1 July = 01:30 on 2 July in Istanbul: groups under 2026-07-02
    startAt: '2026-07-01T22:30:00.000Z',
    endAt: '2026-07-01T23:15:00.000Z',
    timezone: 'Europe/Istanbul',
    source: 'quick-add',
  },
  { ...deps, id: () => 'event-2' },
);

const unremembered = createLifeEvent(
  {
    userId: 'user-1',
    kind: 'unremembered',
    startAt: '2026-07-02T10:00:00.000Z',
    endAt: '2026-07-02T12:00:00.000Z',
    timezone: 'Europe/Istanbul',
    source: 'gap-fill',
  },
  { ...deps, id: () => 'event-3' },
);

describe('JSON export', () => {
  test('round-trips events losslessly', () => {
    const json = toJsonExport([coffee, lateNight, unremembered], { exportedAt: EXPORTED_AT });

    const parsed = parseJsonExport(json);

    expect(parsed.exportedAt).toBe(EXPORTED_AT);
    expect(parsed.events).toEqual(
      [...[coffee, lateNight, unremembered]].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    );
  });

  test('declares schemaVersion 1', () => {
    const json = toJsonExport([coffee], { exportedAt: EXPORTED_AT });

    expect(JSON.parse(json).schemaVersion).toBe(1);
  });

  test('parse rejects an unknown schemaVersion with a clear error', () => {
    const tampered = JSON.stringify({ schemaVersion: 99, exportedAt: EXPORTED_AT, events: [] });

    expect(() => parseJsonExport(tampered)).toThrowError(/schemaVersion/);
  });

  test('parse rejects structurally invalid payloads', () => {
    expect(() => parseJsonExport('{"schemaVersion":1}')).toThrowError();
  });
});

describe('Markdown export', () => {
  const markdown = toMarkdownExport([coffee, lateNight, unremembered], {
    exportedAt: EXPORTED_AT,
  });

  test('groups events under their local calendar day', () => {
    // Both events happen on 2026-07-02 in Istanbul local time, despite lateNight
    // starting on 1 July in UTC.
    expect(markdown).toContain('## 2026-07-02');
    expect(markdown).not.toContain('## 2026-07-01');
  });

  test('renders local wall-clock times and the title', () => {
    expect(markdown).toContain('09:00–10:30 — Coffee with Sarah');
    expect(markdown).toContain('01:30–02:15 — Reading before bed');
  });

  test('orders events within a day by start time', () => {
    const readingIndex = markdown.indexOf('Reading before bed');
    const coffeeIndex = markdown.indexOf('Coffee with Sarah');

    expect(readingIndex).toBeGreaterThan(-1);
    expect(coffeeIndex).toBeGreaterThan(-1);
    expect(readingIndex).toBeLessThan(coffeeIndex);
  });

  test('includes people, place, and notes when present', () => {
    expect(markdown).toContain('Sarah');
    expect(markdown).toContain('Kadıköy');
    expect(markdown).toContain('She got the new job!');
  });

  test('renders unremembered time neutrally, with no judgment vocabulary', () => {
    expect(markdown).toContain('Unremembered time');
    for (const banned of ['wasted', 'failed', 'lazy', 'disappointing']) {
      expect(markdown.toLowerCase()).not.toContain(banned);
    }
  });

  test('stays readable without Chronos: has a header and export timestamp', () => {
    expect(markdown).toContain('# Chronos');
    expect(markdown).toContain(EXPORTED_AT);
  });
});
