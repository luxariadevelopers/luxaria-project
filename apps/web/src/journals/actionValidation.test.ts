import { describe, expect, it } from 'vitest';
import { reverseJournalSchema } from './actionValidation';

describe('reverseJournalSchema', () => {
  it('requires date and reason (narration)', () => {
    expect(
      reverseJournalSchema.safeParse({
        journalDate: '',
        narration: '',
      }).success,
    ).toBe(false);

    expect(
      reverseJournalSchema.safeParse({
        journalDate: '2026-07-20',
        narration: 'Correct posting error',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid date format', () => {
    expect(
      reverseJournalSchema.safeParse({
        journalDate: '20/07/2026',
        narration: 'Reason',
      }).success,
    ).toBe(false);
  });
});
