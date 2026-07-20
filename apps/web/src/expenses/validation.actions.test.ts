import { describe, expect, it } from 'vitest';
import {
  cancelExpenseSchema,
  rejectExpenseSchema,
  returnExpenseSchema,
} from './validation';

describe('rejectExpenseSchema', () => {
  it('requires non-empty comments (reason)', () => {
    expect(rejectExpenseSchema.safeParse({ reason: '' }).success).toBe(false);
    expect(rejectExpenseSchema.safeParse({ reason: '   ' }).success).toBe(
      false,
    );
    expect(
      rejectExpenseSchema.safeParse({ reason: 'Duplicate bill' }).success,
    ).toBe(true);
  });
});

describe('cancelExpenseSchema', () => {
  it('requires cancellation reason (prompt reversal reason)', () => {
    expect(
      cancelExpenseSchema.safeParse({ cancellationReason: '' }).success,
    ).toBe(false);
    expect(
      cancelExpenseSchema.safeParse({
        cancellationReason: 'Entered against wrong project',
      }).success,
    ).toBe(true);
  });
});

describe('returnExpenseSchema', () => {
  it('allows empty optional comment', () => {
    expect(returnExpenseSchema.safeParse({ comment: '' }).success).toBe(true);
    expect(
      returnExpenseSchema.safeParse({ comment: 'Fix photo' }).success,
    ).toBe(true);
  });
});
