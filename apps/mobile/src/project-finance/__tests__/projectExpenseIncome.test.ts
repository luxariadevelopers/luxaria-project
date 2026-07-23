import {
  buildProjectFinanceJournal,
  buildProjectTransferJournal,
  consolidateTransferFinanceRows,
  expenseAccountOptionLabel,
  financeRowTypeLabel,
  financeRowVoucherLabel,
  incomeAccountOptionLabel,
  mapBookRowsToFinanceRows,
  mergeProjectFinanceRows,
  paymentNarrationPart,
  summariseFinanceRows,
  type ProjectFinanceRow,
} from '../projectExpenseIncome';
import type { LedgerLineRow } from '../types';

function row(partial: Partial<LedgerLineRow>): LedgerLineRow {
  return {
    journalId: 'j1',
    journalNumber: 'JV-1',
    journalDate: '2026-07-21',
    accountId: 'a1',
    accountCode: '1100',
    accountName: 'Bank',
    narration: 'Test',
    description: null,
    debit: 0,
    credit: 0,
    runningBalance: 0,
    projectId: 'p1',
    partyType: null,
    partyId: null,
    fundingSource: null,
    sourceModule: null,
    sourceEntityType: null,
    sourceEntityId: null,
    ...partial,
  };
}

describe('projectExpenseIncome helpers', () => {
  it('maps bank book debit as income and credit as expense', () => {
    const rows = mapBookRowsToFinanceRows(
      [
        row({ debit: 1000, credit: 0, journalNumber: 'IN-1' }),
        row({ debit: 0, credit: 400, journalNumber: 'EX-1' }),
      ],
      'bank',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.kind).toBe('income');
    expect(rows[0]?.amount).toBe(1000);
    expect(rows[1]?.kind).toBe('expense');
    expect(rows[1]?.amount).toBe(400);
    expect(summariseFinanceRows(rows)).toEqual({
      income: 1000,
      expense: 400,
      net: 600,
      capitalIncome: 0,
      loanIncome: 0,
      otherIncome: 1000,
    });
  });

  it('labels director loan receipts as Loan income', () => {
    const rows = mapBookRowsToFinanceRows(
      [
        row({
          debit: 2_050_000,
          credit: 0,
          fundingSource: 'director',
          narration: 'Director loan: DIR-0001',
        }),
      ],
      'bank',
    );
    expect(rows[0]?.isLoanIncome).toBe(true);
    expect(financeRowTypeLabel(rows[0]!)).toBe('Loan income');
  });

  it('builds balanced expense journal from bank', () => {
    const journal = buildProjectFinanceJournal({
      projectId: '507f1f77bcf86cd799439011',
      journalDate: '2026-07-21',
      amount: 25000,
      narration: 'Land registration',
      bookAccountId: '507f1f77bcf86cd799439012',
      contraAccountId: '507f1f77bcf86cd799439013',
      kind: 'expense',
    });
    expect(journal.projectId).toBe('507f1f77bcf86cd799439011');
    expect(journal.sourceEntityType).toBe('project_expense');
    expect(journal.lines[0]?.credit).toBe(25000);
    expect(journal.lines[1]?.debit).toBe(25000);
  });

  it('builds transfer journal Cr from / Dr to', () => {
    const journal = buildProjectTransferJournal({
      projectId: '507f1f77bcf86cd799439011',
      journalDate: '2026-07-21',
      amount: 5000,
      narration: 'Bank to cash',
      fromAccountId: '507f1f77bcf86cd799439012',
      toAccountId: '507f1f77bcf86cd799439013',
    });
    expect(journal.sourceEntityType).toBe('project_transfer');
    expect(journal.lines[0]?.credit).toBe(5000);
    expect(journal.lines[1]?.debit).toBe(5000);
  });

  it('consolidates paired transfer legs', () => {
    const rows: ProjectFinanceRow[] = [
      {
        id: 'from',
        kind: 'transfer',
        book: 'bank',
        journalId: 'j-t',
        journalNumber: 'TR-1',
        journalDate: '2026-07-21',
        accountCode: '1100',
        accountName: 'Bank',
        narration: 'Transfer',
        description: null,
        amount: 1000,
        transferLeg: 'from',
      },
      {
        id: 'to',
        kind: 'transfer',
        book: 'cash',
        journalId: 'j-t',
        journalNumber: 'TR-1',
        journalDate: '2026-07-21',
        accountCode: '1200',
        accountName: 'Cash',
        narration: 'Transfer',
        description: null,
        amount: 1000,
        transferLeg: 'to',
      },
    ];
    const consolidated = consolidateTransferFinanceRows(rows);
    expect(consolidated).toHaveLength(1);
    expect(consolidated[0]?.accountCode).toBe('1100 → 1200');
    expect(consolidated[0]?.amount).toBe(1000);
  });

  it('merges and sorts finance rows by date desc', () => {
    const a = mapBookRowsToFinanceRows(
      [row({ journalDate: '2026-07-20', debit: 100, journalNumber: 'A' })],
      'bank',
    );
    const b = mapBookRowsToFinanceRows(
      [row({ journalDate: '2026-07-22', debit: 200, journalNumber: 'B' })],
      'cash',
    );
    const merged = mergeProjectFinanceRows(a, b);
    expect(merged[0]?.journalNumber).toBe('B');
    expect(merged[1]?.journalNumber).toBe('A');
  });

  it('labels income and expense accounts in plain language', () => {
    expect(
      incomeAccountOptionLabel({
        accountCode: '3100',
        accountName: 'Director Account',
        accountCategory: 'director_account',
      }),
    ).toMatch(/director \(loan/i);
    expect(
      expenseAccountOptionLabel({
        accountCode: '5220',
        accountName: 'Auditor fee',
        accountCategory: 'indirect_expense',
      }),
    ).toBe('5220 — Auditor fee');
  });

  it('formats payment narration parts', () => {
    expect(paymentNarrationPart('cheque', '123')).toBe('Cheque no. 123');
    expect(paymentNarrationPart('upi', 'TXN')).toBe('UPI txn ID TXN');
    expect(paymentNarrationPart('cash_withdrawal', '')).toBe('Cash withdrawal');
  });

  it('shows cheque/UPI/transfer in voucher label, JV only for bare expenses', () => {
    const base: ProjectFinanceRow = {
      id: 'r1',
      kind: 'income',
      book: 'bank',
      journalId: 'j1',
      journalNumber: 'JV-2026-000023',
      journalDate: '2026-07-21',
      accountCode: '1110',
      accountName: 'Bank',
      narration: 'EXCESS · Transfer ref. NEFTCNRB H001 47485371',
      description: null,
      amount: 156_000,
    };
    expect(financeRowVoucherLabel(base)).toBe(
      'Transfer NEFTCNRB H001 47485371',
    );
    expect(
      financeRowVoucherLabel({
        ...base,
        narration: 'Director loan · Cheque no. 877020',
      }),
    ).toBe('Cheque 877020');
    expect(
      financeRowVoucherLabel({
        ...base,
        kind: 'expense',
        journalNumber: 'JV-2026-000099',
        narration: 'Labour salary week 28',
      }),
    ).toBe('JV-2026-000099');
    expect(
      financeRowVoucherLabel({
        ...base,
        narration: 'Other income with no instrument',
      }),
    ).toBeNull();
  });
});
