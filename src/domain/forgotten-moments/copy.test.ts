import { describe, expect, it } from 'vitest';

import {
  aggregateForgottenLead,
  gapFillHint,
  gapFillQuestion,
} from '@/domain/forgotten-moments/copy';
import { findJudgmentWord } from '@/domain/reflection/tone';

describe('ring forgotten-moment copy', () => {
  it('asks about the exact hour range, as a question (§5.2.2)', () => {
    const question = gapFillQuestion('13:00', '15:00');
    expect(question).toContain('13:00–15:00');
    expect(question.endsWith('?')).toBe(true);
  });

  it('counts unwritten stretches without judgment (§5.2.4)', () => {
    expect(aggregateForgottenLead(1)).toContain('One stretch');
    expect(aggregateForgottenLead(3)).toContain('3 stretches');
  });

  it('never uses judgment vocabulary anywhere', () => {
    const all = [gapFillQuestion('13:00', '15:00'), gapFillHint(), aggregateForgottenLead(2)];
    for (const copy of all) {
      expect(findJudgmentWord(copy)).toBeNull();
    }
  });
});
