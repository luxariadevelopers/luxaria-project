import { describe, expect, it } from 'vitest';
import {
  assertRequestedTotalConsistent,
  sumRequirementItemAmounts,
} from './itemTotals';
import {
  assertWeekDates,
  defaultWeekRange,
  pettyCashRequestFormSchema,
} from './validation';
import { PettyCashExpenseCategory } from './types';

describe('sumRequirementItemAmounts', () => {
  it('sums positive item amounts to 2 dp', () => {
    expect(
      sumRequirementItemAmounts([
        { estimatedAmount: 100.105 },
        { estimatedAmount: 50.2 },
      ]),
    ).toBe(150.31);
  });

  it('treats non-finite amounts as zero', () => {
    expect(
      sumRequirementItemAmounts([
        { estimatedAmount: Number.NaN },
        { estimatedAmount: 25 },
      ]),
    ).toBe(25);
  });
});

describe('assertRequestedTotalConsistent', () => {
  it('requires a positive total', () => {
    const result = assertRequestedTotalConsistent([
      { estimatedAmount: 0 },
      { estimatedAmount: 0 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/greater than zero/);
    }
  });

  it('accepts when requested total matches item sum', () => {
    const result = assertRequestedTotalConsistent(
      [{ estimatedAmount: 100 }, { estimatedAmount: 50 }],
      150,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.total).toBe(150);
    }
  });

  it('rejects mismatched requested total', () => {
    const result = assertRequestedTotalConsistent(
      [{ estimatedAmount: 100 }, { estimatedAmount: 50 }],
      200,
    );
    expect(result.ok).toBe(false);
  });
});

describe('assertWeekDates', () => {
  it('accepts a Mon–Sun week', () => {
    expect(assertWeekDates('2026-07-13', '2026-07-19').ok).toBe(true);
  });

  it('rejects end before start', () => {
    const result = assertWeekDates('2026-07-19', '2026-07-13');
    expect(result.ok).toBe(false);
  });

  it('rejects spans over 7 days', () => {
    const result = assertWeekDates('2026-07-13', '2026-07-21');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/7 days/);
    }
  });
});

describe('defaultWeekRange', () => {
  it('returns a 7-day inclusive Mon–Sun range', () => {
    const week = defaultWeekRange(new Date('2026-07-15T12:00:00.000Z'));
    expect(week.weekStartDate).toBe('2026-07-13');
    expect(week.weekEndDate).toBe('2026-07-19');
    expect(assertWeekDates(week.weekStartDate, week.weekEndDate).ok).toBe(
      true,
    );
  });
});

describe('pettyCashRequestFormSchema item totals', () => {
  const base = {
    projectId: '507f1f77bcf86cd799439011',
    pettyCashAccountId: '507f1f77bcf86cd799439012',
    weekStartDate: '2026-07-13',
    weekEndDate: '2026-07-19',
    justification: 'Weekly site float',
  };

  it('accepts positive item amounts that sum above zero', () => {
    const parsed = pettyCashRequestFormSchema.safeParse({
      ...base,
      requirementItems: [
        {
          expenseCategory: PettyCashExpenseCategory.Transport,
          description: 'Site transport',
          estimatedAmount: 2500,
        },
        {
          expenseCategory: PettyCashExpenseCategory.Food,
          description: 'Labour meals',
          estimatedAmount: 1500,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects zero or negative item amounts', () => {
    const parsed = pettyCashRequestFormSchema.safeParse({
      ...base,
      requirementItems: [
        {
          expenseCategory: PettyCashExpenseCategory.Other,
          description: 'Misc',
          estimatedAmount: 0,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects week longer than 7 days', () => {
    const parsed = pettyCashRequestFormSchema.safeParse({
      ...base,
      weekEndDate: '2026-07-21',
      requirementItems: [
        {
          expenseCategory: PettyCashExpenseCategory.Other,
          description: 'Misc',
          estimatedAmount: 100,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
