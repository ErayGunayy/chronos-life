import { describe, expect, test } from 'vitest';

import { JUDGMENT_VOCABULARY, assertCalmCopy, findJudgmentWord } from '@/domain/reflection/tone';

describe('tone guardrail (§5.5 rule 3: guilt vocabulary is banned everywhere)', () => {
  test('the banned list matches the spec', () => {
    expect([...JUDGMENT_VOCABULARY]).toEqual(['wasted', 'failed', 'lazy', 'disappointing']);
  });

  test.each([
    ['You wasted your afternoon', 'wasted'],
    ['Wasted time again', 'wasted'],
    ['that FAILED attempt', 'failed'],
    ['a lazy morning', 'lazy'],
    ['a disappointing week', 'disappointing'],
  ])('finds %j → %s regardless of case', (text, word) => {
    expect(findJudgmentWord(text)).toBe(word);
  });

  test('matches whole words only — no false positives inside other words', () => {
    expect(findJudgmentWord('an unwasted, unfailed, blazingly good day')).toBeNull();
  });

  test('returns null for calm copy', () => {
    expect(findJudgmentWord('I noticed mid-afternoon often goes unwritten.')).toBeNull();
  });

  test('assertCalmCopy returns the text unchanged when clean', () => {
    const copy = 'Curious what usually happens there?';
    expect(assertCalmCopy(copy)).toBe(copy);
  });

  test('assertCalmCopy throws and names the offending word', () => {
    expect(() => assertCalmCopy('You wasted the evening')).toThrowError(/wasted/);
  });
});
