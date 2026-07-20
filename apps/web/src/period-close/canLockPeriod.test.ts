import { describe, expect, it } from 'vitest';
import { canLockPeriod } from './canLockPeriod';
import {
  AccountingPeriodStatus,
  PeriodChecklistItemStatus,
  type PublicAccountingPeriod,
} from './types';

function period(
  overrides: Partial<PublicAccountingPeriod> = {},
): PublicAccountingPeriod {
  return {
    id: '507f1f77bcf86cd799439011',
    periodNumber: 'AP-202607',
    periodType: 'monthly',
    companyId: null,
    financialYearId: '507f1f77bcf86cd799439012',
    year: 2026,
    month: 7,
    periodFrom: '2026-07-01T00:00:00.000Z',
    periodTo: '2026-07-31T23:59:59.999Z',
    status: AccountingPeriodStatus.Open,
    validationRunAt: '2026-07-20T10:00:00.000Z',
    validationPassed: true,
    checklist: [
      {
        key: 'unposted_journals',
        label: 'Unposted journals',
        status: PeriodChecklistItemStatus.Passed,
        issueCount: 0,
        issues: [],
        checkedAt: '2026-07-20T10:00:00.000Z',
      },
    ],
    lockedAt: null,
    closedAt: null,
    notes: null,
    ...overrides,
  };
}

describe('canLockPeriod', () => {
  it('blocks lock when checklist items failed (unresolved blocking checks)', () => {
    const gate = canLockPeriod(
      period({
        validationPassed: true,
        checklist: [
          {
            key: 'unposted_journals',
            label: 'Unposted journals',
            status: PeriodChecklistItemStatus.Failed,
            issueCount: 2,
            issues: [
              {
                entityType: 'journal',
                entityId: 'j1',
                reference: 'JV-1',
                detail: 'Draft journal',
              },
            ],
            checkedAt: '2026-07-20T10:00:00.000Z',
          },
        ],
      }),
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.failedCount).toBe(1);
      expect(gate.reason).toMatch(/checklist item/i);
    }
  });

  it('blocks lock when validation has not passed', () => {
    const gate = canLockPeriod(
      period({ validationPassed: false, checklist: [] }),
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.reason).toMatch(/pre-close validation/i);
    }
  });

  it('allows successful closure lock when open, validated, and clear', () => {
    const gate = canLockPeriod(period());
    expect(gate).toEqual({ ok: true });
  });

  it('blocks lock for already locked periods', () => {
    const gate = canLockPeriod(
      period({ status: AccountingPeriodStatus.Locked }),
    );
    expect(gate.ok).toBe(false);
  });
});
