import { describe, expect, it } from 'vitest';
import {
  computeRunningBalances,
  nearlyEqual,
  runningBalancesMatch,
  validateCashBankBookPayload,
  validateOpeningMovementsClosing,
} from './reconcile';
import type { CashBankBookPayload, LedgerLineRow } from './types';

function line(
  partial: Partial<LedgerLineRow> &
    Pick<LedgerLineRow, 'debit' | 'credit' | 'runningBalance'>,
): LedgerLineRow {
  return {
    journalId: 'j1',
    journalNumber: 'JV-1',
    journalDate: '2026-04-02T00:00:00.000Z',
    accountId: 'a1',
    accountCode: '1100',
    accountName: 'Bank',
    narration: 'test',
    description: null,
    projectId: null,
    partyType: null,
    partyId: null,
    sourceModule: null,
    sourceEntityType: null,
    sourceEntityId: null,
    drillDown: [],
    ...partial,
  };
}

describe('cash/bank book running balance reconciliation', () => {
  it('opening + movements equals closing', () => {
    const check = validateOpeningMovementsClosing({
      openingBalance: 100_000,
      periodDebit: 50_000,
      periodCredit: 15_000,
      closingBalance: 135_000,
    });
    expect(check.ok).toBe(true);
    expect(check.expectedClosing).toBe(135_000);
  });

  it('flags broken closing balance', () => {
    const check = validateOpeningMovementsClosing({
      openingBalance: 100_000,
      periodDebit: 50_000,
      periodCredit: 15_000,
      closingBalance: 134_999,
    });
    expect(check.ok).toBe(false);
  });

  it('computes chronological running balances', () => {
    const opening = 100_000;
    const rows = [
      { debit: 50_000, credit: 0 },
      { debit: 0, credit: 15_000 },
    ];
    expect(computeRunningBalances(opening, rows)).toEqual([150_000, 135_000]);
  });

  it('matches Nest-style runningBalance on each row', () => {
    const opening = 10_000;
    const rows = [
      line({ debit: 1_000, credit: 0, runningBalance: 11_000 }),
      line({ debit: 0, credit: 250.5, runningBalance: 10_749.5 }),
      line({ debit: 0.25, credit: 0, runningBalance: 10_749.75 }),
    ];
    expect(runningBalancesMatch(opening, rows)).toBe(true);
  });

  it('rejects drifted running balance', () => {
    const opening = 10_000;
    const rows = [
      line({ debit: 1_000, credit: 0, runningBalance: 11_000 }),
      line({ debit: 0, credit: 250, runningBalance: 10_800 }),
    ];
    expect(runningBalancesMatch(opening, rows)).toBe(false);
  });

  it('validates a full payload like Nest bank book', () => {
    const payload: CashBankBookPayload = {
      meta: {
        reportType: 'bank-book',
        title: 'Bank Book',
        filters: {
          financialYearId: 'fy',
          financialYearName: 'FY26',
          projectId: 'p',
          projectCode: 'P1',
          projectName: 'Tower',
          from: '2026-04-01T00:00:00.000Z',
          to: '2027-03-31T00:00:00.000Z',
          accountId: null,
          partyId: null,
        },
        generatedAt: '2026-07-20T00:00:00.000Z',
        reconciled: true,
        reconciliationNotes: [],
      },
      openingBalance: 100_000,
      closingBalance: 135_000,
      rows: [
        line({ debit: 50_000, credit: 0, runningBalance: 150_000 }),
        line({ debit: 0, credit: 15_000, runningBalance: 135_000 }),
      ],
      totals: {
        debit: 50_000,
        credit: 15_000,
        openingBalance: 100_000,
        closingBalance: 135_000,
      },
    };
    const result = validateCashBankBookPayload(payload);
    expect(result.totalsOk).toBe(true);
    expect(result.runningOk).toBe(true);
    expect(nearlyEqual(result.expectedClosing, 135_000)).toBe(true);
  });
});
