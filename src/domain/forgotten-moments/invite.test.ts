import { describe, expect, test } from 'vitest';

import { buildForgottenMomentsInvite } from '@/domain/forgotten-moments/invite';
import { findJudgmentWord } from '@/domain/reflection/tone';
import type { Gap } from '@/domain/timeline/gaps';

const TZ = 'Europe/Istanbul';

function gap(startAt: string, endAt: string, kind: Gap['kind']): Gap {
  return {
    startAt,
    endAt,
    durationMinutes: (Date.parse(endAt) - Date.parse(startAt)) / 60_000,
    kind,
  };
}

// 10:00Z–12:00Z = 13:00–15:00 local in Istanbul (UTC+3), 120 minutes
const twoHours = gap('2026-07-02T10:00:00.000Z', '2026-07-02T12:00:00.000Z', 'forgotten-moment');
const oneHour = gap('2026-07-02T16:00:00.000Z', '2026-07-02T17:00:00.000Z', 'forgotten-moment');
const routine = gap('2026-07-02T07:00:00.000Z', '2026-07-02T07:30:00.000Z', 'routine');

describe('buildForgottenMomentsInvite (§6.4: one bundled, gentle invitation)', () => {
  test('null when there are no Forgotten Moments — silence is correct', () => {
    expect(buildForgottenMomentsInvite([], TZ)).toBeNull();
    expect(buildForgottenMomentsInvite([routine], TZ)).toBeNull();
  });

  test('routine gaps are never surfaced (§6.3)', () => {
    const invite = buildForgottenMomentsInvite([routine, oneHour], TZ);

    expect(invite?.moments).toHaveLength(1);
    expect(invite?.message).not.toContain('10:00–10:30');
  });

  test('a single gap gets a singular, local-time message ending in a question', () => {
    const invite = buildForgottenMomentsInvite([oneHour], TZ);

    expect(invite?.message).toBe(
      "I didn't catch what happened between 19:00–20:00. Want to fill it in now, or come back to it later?",
    );
  });

  test('multiple gaps are bundled into one message, longest first (§6.4)', () => {
    const invite = buildForgottenMomentsInvite([oneHour, twoHours], TZ);

    expect(invite?.moments.map((m) => m.durationMinutes)).toEqual([120, 60]);
    expect(invite?.message).toBe(
      "I didn't catch what happened between 13:00–15:00 or 19:00–20:00. Want to fill one in now, or come back to them later?",
    );
  });

  test('three or more ranges read as a list', () => {
    const third = gap('2026-07-02T18:00:00.000Z', '2026-07-02T19:00:00.000Z', 'forgotten-moment');
    const invite = buildForgottenMomentsInvite([third, oneHour, twoHours], TZ);

    expect(invite?.message).toContain('13:00–15:00, 19:00–20:00, or 21:00–22:00');
  });

  test('moments carry local labels and UTC instants for follow-up actions', () => {
    const invite = buildForgottenMomentsInvite([twoHours], TZ);

    expect(invite?.moments[0]).toEqual({
      startAt: '2026-07-02T10:00:00.000Z',
      endAt: '2026-07-02T12:00:00.000Z',
      startLabel: '13:00',
      endLabel: '15:00',
      durationMinutes: 120,
    });
  });

  test('the invitation always passes the tone guardrail and returns the question to the user', () => {
    const invite = buildForgottenMomentsInvite([oneHour, twoHours], TZ);

    expect(findJudgmentWord(invite?.message ?? '')).toBeNull();
    expect(invite?.message.trim().endsWith('?')).toBe(true);
  });
});
