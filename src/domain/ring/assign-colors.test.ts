import { describe, expect, it } from 'vitest';

import {
  assignCategoryColors,
  categoriesInFirstSeenOrder,
} from '@/domain/ring/assign-colors';
import { createLifeEvent } from '@/domain/life-event/factory';
import type { LifeEvent } from '@/domain/life-event/types';

function event(overrides: {
  category?: string | null;
  createdAt: string;
  startAt?: string;
}): LifeEvent {
  return createLifeEvent(
    {
      userId: 'user-a',
      title: 'Something',
      category: overrides.category ?? null,
      startAt: overrides.startAt ?? '2026-07-01T09:00:00.000Z',
      endAt: '2026-07-01T10:00:00.000Z',
      timezone: 'UTC',
      source: 'life-conversation',
    },
    { id: () => crypto.randomUUID(), now: () => overrides.createdAt },
  );
}

describe('categoriesInFirstSeenOrder', () => {
  it('orders categories by when they first entered the story', () => {
    // Arrange — Health was recorded before Learning, despite a later start time
    const events = [
      event({ category: 'Learning', createdAt: '2026-07-02T20:00:00.000Z' }),
      event({ category: 'Health', createdAt: '2026-07-01T20:00:00.000Z' }),
      event({ category: 'Learning', createdAt: '2026-07-03T20:00:00.000Z' }),
      event({ category: null, createdAt: '2026-06-30T20:00:00.000Z' }),
    ];

    // Act + Assert
    expect(categoriesInFirstSeenOrder(events)).toEqual(['Health', 'Learning']);
  });

  it('trims names and ignores empty categories', () => {
    const events = [event({ category: '  Family ', createdAt: '2026-07-01T20:00:00.000Z' })];
    expect(categoriesInFirstSeenOrder(events)).toEqual(['Family']);
  });
});

describe('assignCategoryColors', () => {
  it('assigns palette indexes in creation order, first category → color 1', () => {
    // Act
    const result = assignCategoryColors({}, ['Learning', 'Health', 'Family']);

    // Assert
    expect(result.assignments).toEqual({ Learning: 0, Health: 1, Family: 2 });
    expect(result.added).toEqual(['Learning', 'Health', 'Family']);
  });

  it('never reassigns an existing category — a color, once given, holds (§5.2.3)', () => {
    // Arrange
    const existing = { Learning: 0, Health: 1 };

    // Act — Learning appears again, plus a newcomer
    const result = assignCategoryColors(existing, ['Health', 'Work', 'Learning']);

    // Assert
    expect(result.assignments).toEqual({ Learning: 0, Health: 1, Work: 2 });
    expect(result.added).toEqual(['Work']);
  });

  it('continues after the highest existing index, even with gaps', () => {
    // Arrange — index 1 was freed by a rename/merge in some future flow
    const existing = { Learning: 0, Family: 4 };

    // Act
    const result = assignCategoryColors(existing, ['Work']);

    // Assert — never reuses an index that may still mean something to the user
    expect(result.assignments.Work).toBe(5);
  });

  it('does not mutate the existing map', () => {
    const existing = { Learning: 0 };
    assignCategoryColors(existing, ['Health']);
    expect(existing).toEqual({ Learning: 0 });
  });
});
