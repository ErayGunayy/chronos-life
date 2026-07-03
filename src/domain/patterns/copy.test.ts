import { describe, expect, test } from 'vitest';

import { firstWeekMessage, weeklyPatternObservation } from '@/domain/patterns/copy';
import { findJudgmentWord } from '@/domain/reflection/tone';

describe('pattern copy (§6.6: observational, never diagnostic, always ends with the question)', () => {
  test('weekly observation names the hour range and returns the interpretation to the user', () => {
    const copy = weeklyPatternObservation({ bucket: 15, share: 0.5 });

    expect(copy).toContain('15:00');
    expect(copy.trim().endsWith('?')).toBe(true);
    expect(findJudgmentWord(copy)).toBeNull();
  });

  test('never states a diagnosis', () => {
    const copy = weeklyPatternObservation({ bucket: 15, share: 0.9 });

    expect(copy.toLowerCase()).not.toContain('always');
    expect(copy.toLowerCase()).not.toContain('distracted');
  });

  test('the pre-week message is an invitation, not an accusation', () => {
    const copy = firstWeekMessage();

    expect(copy.trim().endsWith('?')).toBe(true);
    expect(findJudgmentWord(copy)).toBeNull();
  });
});
