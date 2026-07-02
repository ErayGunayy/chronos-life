import { describe, expect, test } from 'vitest';

import { LifeEventValidationError } from '@/domain/life-event/errors';
import { createLifeEvent, updateLifeEvent } from '@/domain/life-event/factory';
import type { NewLifeEventInput } from '@/domain/life-event/types';

const deps = {
  id: () => 'event-1',
  now: () => '2026-07-02T19:00:00.000Z',
};

function baseInput(overrides: Partial<NewLifeEventInput> = {}): NewLifeEventInput {
  return {
    userId: 'user-1',
    title: 'Coffee with Sarah',
    startAt: '2026-07-02T06:00:00.000Z',
    endAt: '2026-07-02T07:30:00.000Z',
    timezone: 'Europe/Istanbul',
    source: 'life-conversation',
    ...overrides,
  };
}

describe('createLifeEvent', () => {
  test('creates an event with defaults for optional fields', () => {
    // Arrange
    const input = baseInput();

    // Act
    const event = createLifeEvent(input, deps);

    // Assert
    expect(event).toMatchObject({
      id: 'event-1',
      userId: 'user-1',
      title: 'Coffee with Sarah',
      description: null,
      category: null,
      categoryConfidence: null,
      startAt: '2026-07-02T06:00:00.000Z',
      endAt: '2026-07-02T07:30:00.000Z',
      timezone: 'Europe/Istanbul',
      kind: 'substantive',
      source: 'life-conversation',
      people: [],
      place: null,
      notes: null,
      version: 1,
      createdAt: '2026-07-02T19:00:00.000Z',
      updatedAt: '2026-07-02T19:00:00.000Z',
    });
  });

  test('returns a frozen object with a frozen people array', () => {
    const event = createLifeEvent(baseInput({ people: ['Sarah'] }), deps);

    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.people)).toBe(true);
  });

  test('copies the people array so later caller mutations do not leak in', () => {
    const people = ['Sarah'];
    const event = createLifeEvent(baseInput({ people }), deps);

    people.push('Mert');

    expect(event.people).toEqual(['Sarah']);
  });

  test('trims the title', () => {
    const event = createLifeEvent(baseInput({ title: '  Coffee with Sarah  ' }), deps);

    expect(event.title).toBe('Coffee with Sarah');
  });

  test('rejects an empty title for a substantive event', () => {
    const act = () => createLifeEvent(baseInput({ title: '   ' }), deps);

    expect(act).toThrowError(LifeEventValidationError);
    expect(act).toThrowError(/title/);
  });

  test('allows a missing title for an unremembered event', () => {
    const event = createLifeEvent(
      baseInput({ kind: 'unremembered', title: undefined, source: 'gap-fill' }),
      deps,
    );

    expect(event.kind).toBe('unremembered');
    expect(event.title).toBe('');
  });

  test('rejects endAt equal to startAt', () => {
    const act = () =>
      createLifeEvent(
        baseInput({ startAt: '2026-07-02T06:00:00.000Z', endAt: '2026-07-02T06:00:00.000Z' }),
        deps,
      );

    expect(act).toThrowError(/endAt/);
  });

  test('rejects endAt before startAt', () => {
    const act = () =>
      createLifeEvent(
        baseInput({ startAt: '2026-07-02T08:00:00.000Z', endAt: '2026-07-02T07:00:00.000Z' }),
        deps,
      );

    expect(act).toThrowError(/endAt/);
  });

  test('rejects an unparseable startAt', () => {
    const act = () => createLifeEvent(baseInput({ startAt: 'yesterday-ish' }), deps);

    expect(act).toThrowError(/startAt/);
  });

  test('rejects an invalid IANA timezone', () => {
    const act = () => createLifeEvent(baseInput({ timezone: 'Mars/Olympus_Mons' }), deps);

    expect(act).toThrowError(/timezone/);
  });

  test.each([
    ['UTC'],
    ['Europe/Istanbul'],
    ['America/New_York'],
  ])('accepts valid timezone %s', (timezone) => {
    const event = createLifeEvent(baseInput({ timezone }), deps);

    expect(event.timezone).toBe(timezone);
  });

  test.each([
    [-0.1],
    [1.1],
    [Number.NaN],
  ])('rejects categoryConfidence %s outside [0, 1]', (categoryConfidence) => {
    const act = () => createLifeEvent(baseInput({ categoryConfidence }), deps);

    expect(act).toThrowError(/categoryConfidence/);
  });

  test.each([[0], [0.5], [1]])('accepts categoryConfidence %s', (categoryConfidence) => {
    const event = createLifeEvent(baseInput({ categoryConfidence, category: 'Social' }), deps);

    expect(event.categoryConfidence).toBe(categoryConfidence);
  });
});

describe('updateLifeEvent', () => {
  const original = createLifeEvent(baseInput({ people: ['Sarah'] }), deps);
  const later = { now: () => '2026-07-02T21:00:00.000Z' };

  test('returns a new object and never mutates the original', () => {
    const snapshot = structuredClone(original);

    const updated = updateLifeEvent(original, { title: 'Coffee with Sarah and Mert' }, later);

    expect(updated).not.toBe(original);
    expect(updated.title).toBe('Coffee with Sarah and Mert');
    expect(original).toEqual(snapshot);
  });

  test('bumps version and sets updatedAt, preserving createdAt', () => {
    const updated = updateLifeEvent(original, { place: 'Kadıköy' }, later);

    expect(updated.version).toBe(original.version + 1);
    expect(updated.updatedAt).toBe('2026-07-02T21:00:00.000Z');
    expect(updated.createdAt).toBe(original.createdAt);
  });

  test('returns a frozen object', () => {
    const updated = updateLifeEvent(original, { notes: 'Great chat.' }, later);

    expect(Object.isFrozen(updated)).toBe(true);
    expect(Object.isFrozen(updated.people)).toBe(true);
  });

  test('re-validates the merged result', () => {
    const act = () => updateLifeEvent(original, { endAt: '2026-07-02T05:00:00.000Z' }, later);

    expect(act).toThrowError(/endAt/);
  });

  test('rejects patches to protected fields', () => {
    const act = () =>
      updateLifeEvent(original, { id: 'event-2' } as unknown as Parameters<typeof updateLifeEvent>[1], later);

    expect(act).toThrowError(/id/);
  });
});
