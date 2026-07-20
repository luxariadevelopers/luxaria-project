import { describe, expect, it } from 'vitest';
import {
  assertNoDuplicateAccountWeek,
  DUPLICATE_ACCOUNT_WEEK_MESSAGE,
  hasDuplicateAccountWeek,
  hasPreviousUnsettledCash,
  isDuplicateAccountWeekMessage,
} from './validation';
import { PettyCashRequirementStatus } from './types';

describe('duplicate account/week', () => {
  const existing = [
    {
      id: 'r1',
      pettyCashAccountId: 'acc1',
      weekStartDate: '2026-07-13T00:00:00.000Z',
      status: PettyCashRequirementStatus.Draft,
    },
    {
      id: 'r2',
      pettyCashAccountId: 'acc1',
      weekStartDate: '2026-07-06T00:00:00.000Z',
      status: PettyCashRequirementStatus.Funded,
    },
    {
      id: 'r3',
      pettyCashAccountId: 'acc1',
      weekStartDate: '2026-07-20T00:00:00.000Z',
      status: PettyCashRequirementStatus.Cancelled,
    },
  ];

  it('detects an open request for the same account and week', () => {
    expect(
      hasDuplicateAccountWeek(existing, {
        pettyCashAccountId: 'acc1',
        weekStartDate: '2026-07-13',
      }),
    ).toBe(true);
    expect(
      assertNoDuplicateAccountWeek(existing, {
        pettyCashAccountId: 'acc1',
        weekStartDate: '2026-07-13',
      }),
    ).toEqual({ ok: false, message: DUPLICATE_ACCOUNT_WEEK_MESSAGE });
  });

  it('allows cancelled/rejected weeks and other accounts', () => {
    expect(
      hasDuplicateAccountWeek(existing, {
        pettyCashAccountId: 'acc1',
        weekStartDate: '2026-07-20',
      }),
    ).toBe(false);
    expect(
      hasDuplicateAccountWeek(existing, {
        pettyCashAccountId: 'acc2',
        weekStartDate: '2026-07-13',
      }),
    ).toBe(false);
  });

  it('excludes the row being edited', () => {
    expect(
      hasDuplicateAccountWeek(existing, {
        pettyCashAccountId: 'acc1',
        weekStartDate: '2026-07-13',
        excludeId: 'r1',
      }),
    ).toBe(false);
  });

  it('recognises Nest conflict message', () => {
    expect(isDuplicateAccountWeekMessage(DUPLICATE_ACCOUNT_WEEK_MESSAGE)).toBe(
      true,
    );
  });
});

describe('previous unsettled cash', () => {
  it('flags positive unsettled amounts', () => {
    expect(hasPreviousUnsettledCash({ previousUnsettledAmount: 10_000 })).toBe(
      true,
    );
    expect(hasPreviousUnsettledCash({ previousUnsettledAmount: 0 })).toBe(
      false,
    );
  });
});
