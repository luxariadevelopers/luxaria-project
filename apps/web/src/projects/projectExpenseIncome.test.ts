import { describe, expect, it } from 'vitest';
import type { LedgerLineRow } from '@/reports/accounting/types';
import type { PublicJournalEntry } from '@/journals/types';
import { JournalPartyType, JournalStatus } from '@/journals/types';
import {
  buildProjectFinanceJournal,
  buildProjectTransferJournal,
  consolidateTransferFinanceRows,
  expandShareCapitalByDirector,
  financeRowTypeLabel,
  financeRowVoucherLabel,
  formatExternalLoanNarration,
  expenseAccountOptionLabel,
  incomeAccountOptionLabel,
  isCompanyShareCapitalRow,
  mapBookRowsToFinanceRows,
  mergeProjectFinanceRows,
  paymentNarrationPart,
  prefillFromFinanceJournal,
  resolveIncomePartyType,
  summariseFinanceRows,
  type ProjectFinanceRow,
} from './projectExpenseIncome';

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
    drillDown: [],
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
    });
  });

  it('labels director loan receipts as Loan income', () => {
    const rows = mapBookRowsToFinanceRows(
      [
        row({
          debit: 2_050_000,
          credit: 0,
          fundingSource: 'director',
          narration:
            'DIRECTOR INCOME · Director loan: DIR-0001 — V. GOLD JENISTON · Cheque no. 000002',
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
      costCentreId: '507f1f77bcf86cd799439099',
    });
    expect(journal.projectId).toBe('507f1f77bcf86cd799439011');
    expect(journal.lines[0]?.credit).toBe(25000);
    expect(journal.lines[1]?.debit).toBe(25000);
    expect(journal.lines[0]?.costCentreId).toBe('507f1f77bcf86cd799439099');
    expect(journal.lines[1]?.costCentreId).toBe('507f1f77bcf86cd799439099');
  });

  it('labels income sources in plain language', () => {
    expect(
      incomeAccountOptionLabel({
        accountCode: '3100',
        accountName: 'Director Account',
        accountCategory: 'director_account',
      }),
    ).toMatch(/director \(loan/i);
    expect(
      expenseAccountOptionLabel({
        accountCode: '3100',
        accountName: 'Director Account',
        accountCategory: 'director_account',
      }),
    ).toMatch(/repay director loan/i);
    expect(
      expenseAccountOptionLabel({
        accountCode: '5400',
        accountName: 'Interest Expense',
        accountCategory: 'interest',
        accountType: 'expense',
      }),
    ).toBe('5400 — Interest Expense (interest paid)');
    expect(
      expenseAccountOptionLabel({
        accountCode: '5220',
        accountName: 'Auditor fee',
        accountCategory: 'indirect_expense',
      }),
    ).toBe('5220 — Auditor fee');
    expect(
      expenseAccountOptionLabel({
        accountCode: '1211',
        accountName: 'Land registration & stamp duty',
        accountCategory: 'land_cost',
      }),
    ).toBe('1211 — Land registration & stamp duty');
    expect(
      expenseAccountOptionLabel({
        accountCode: '4300',
        accountName: 'Interest Income',
        accountCategory: 'interest',
        accountType: 'income',
      }),
    ).toMatch(/interest income/i);
    expect(
      incomeAccountOptionLabel({
        accountCode: '4100',
        accountName: 'Sales',
        accountCategory: 'sales',
      }),
    ).toMatch(/pick client/i);
    expect(
      incomeAccountOptionLabel({
        accountCode: '2200',
        accountName: 'Loans',
        accountCategory: 'loan',
      }),
    ).toMatch(/external loan/i);
  });

  it('resolves party type by income source (loan has no director/investor)', () => {
    expect(resolveIncomePartyType('director_account')).toBe('director');
    expect(resolveIncomePartyType('investor_account')).toBe('investor');
    expect(resolveIncomePartyType('loan')).toBeNull();
    expect(resolveIncomePartyType('sales')).toBe('customer');
  });

  it('formats secured and unsecured external loan narration', () => {
    expect(
      formatExternalLoanNarration({
        security: 'unsecured',
        hasInterest: false,
        lenderKind: 'third_party',
        lenderName: 'Private lender',
      }),
    ).toBe(
      'Unsecured loan · From 3rd party: Private lender · Without interest',
    );
    expect(
      formatExternalLoanNarration({
        security: 'unsecured',
        hasInterest: true,
        interestRate: 10,
        lenderKind: 'third_party',
        lenderName: 'ABC Finance',
      }),
    ).toBe(
      'Unsecured loan · From 3rd party: ABC Finance · Interest 10% p.a.',
    );
    expect(
      formatExternalLoanNarration({
        security: 'secured',
        hasInterest: true,
        interestRate: 12.5,
        lenderKind: 'bank',
        lenderName: 'ICICI Bank',
      }),
    ).toBe('Secured loan · From bank: ICICI Bank · Interest 12.5% p.a.');
  });

  it('maps company share capital bank rows as capital income', () => {
    const capital = row({
      debit: 10_000_000,
      credit: 0,
      projectId: null,
      sourceModule: 'share_capital',
      sourceEntityType: 'company_share_capital',
      journalNumber: 'JV-2026-000001',
      narration: 'Director share capital received into bank',
    });
    expect(isCompanyShareCapitalRow(capital)).toBe(true);
    const mapped = mapBookRowsToFinanceRows([capital], 'bank', {
      includeCompanyCapitalOnly: true,
    });
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.kind).toBe('income');
    expect(mapped[0]?.isCompanyCapital).toBe(true);
    expect(mapped[0]?.amount).toBe(10_000_000);
  });

  it('merges company capital with project movements', () => {
    const capital = mapBookRowsToFinanceRows(
      [
        row({
          debit: 10_000_000,
          credit: 0,
          projectId: null,
          sourceModule: 'share_capital',
          journalNumber: 'JV-1',
          journalDate: '2026-07-01',
        }),
      ],
      'bank',
      { includeCompanyCapitalOnly: true },
    );
    const project = mapBookRowsToFinanceRows(
      [
        row({
          debit: 0,
          credit: 50_000,
          journalNumber: 'JV-2',
          journalDate: '2026-07-21',
        }),
      ],
      'bank',
    );
    const merged = mergeProjectFinanceRows(capital, project);
    expect(merged).toHaveLength(2);
    expect(summariseFinanceRows(merged)).toEqual({
      income: 10_000_000,
      expense: 50_000,
      net: 9_950_000,
    });
  });

  it('expands share capital into one income row per director name', () => {
    const bankRows = mapBookRowsToFinanceRows(
      [
        row({
          journalId: 'j-cap',
          journalNumber: 'JV-CAP',
          debit: 10_000_000,
          credit: 0,
          projectId: null,
          sourceModule: 'share_capital',
        }),
      ],
      'bank',
      { includeCompanyCapitalOnly: true },
    );
    const journal: PublicJournalEntry = {
      id: 'j-cap',
      journalNumber: 'JV-CAP',
      journalDate: '2026-07-21',
      financialYearId: 'fy1',
      projectId: null,
      sourceModule: 'share_capital',
      sourceEntityType: 'company_share_capital',
      sourceEntityId: 'c1',
      narration: 'Director share capital',
      status: JournalStatus.Posted,
      totalDebit: 10_000_000,
      totalCredit: 10_000_000,
      postedAt: null,
      postedBy: null,
      reversalOf: null,
      reversedBy: null,
      idempotencyKey: null,
      lines: [
        {
          id: 'l0',
          accountId: 'bank',
          debit: 10_000_000,
          credit: 0,
          projectId: null,
          blockId: null,
          costCentreId: null,
          boqItemId: null,
          partyType: null,
          partyId: null,
          fundingSource: null,
          description: 'Share capital received',
        },
        {
          id: 'l1',
          accountId: 'dir',
          debit: 0,
          credit: 2_500_000,
          projectId: null,
          blockId: null,
          costCentreId: null,
          boqItemId: null,
          partyType: JournalPartyType.Director,
          partyId: 'd1',
          fundingSource: null,
          description: 'Capital 250000 shares × ₹10',
        },
        {
          id: 'l2',
          accountId: 'dir',
          debit: 0,
          credit: 2_500_000,
          projectId: null,
          blockId: null,
          costCentreId: null,
          boqItemId: null,
          partyType: JournalPartyType.Director,
          partyId: 'd2',
          fundingSource: null,
          description: 'Capital 250000 shares × ₹10',
        },
      ],
    };
    const expanded = expandShareCapitalByDirector(
      bankRows,
      new Map([['j-cap', journal]]),
      new Map([
        ['d1', 'Asha Director'],
        ['d2', 'Bala Director'],
      ]),
    );
    expect(expanded).toHaveLength(2);
    expect(expanded.map((r) => r.directorName)).toEqual([
      'Asha Director',
      'Bala Director',
    ]);
    expect(expanded.every((r) => r.amount === 2_500_000)).toBe(true);
    expect(summariseFinanceRows(expanded).income).toBe(5_000_000);
  });

  it('prefills edit form from a director loan income journal', () => {
    const financeRow: ProjectFinanceRow = {
      id: 'bank-j1',
      kind: 'income',
      book: 'bank',
      journalId: 'j1',
      journalNumber: 'JV-2026-000004',
      journalDate: '2026-07-21T00:00:00.000Z',
      accountCode: '1100',
      accountName: 'Bank',
      narration:
        'DIRECTOR APPROVAL · Director loan: DIR-0004 — SWEETSON · Transfer ref. RTGS-TMBLR5202607150',
      description: null,
      amount: 2_050_000,
      isLoanIncome: true,
    };
    const journal: PublicJournalEntry = {
      id: 'j1',
      journalNumber: 'JV-2026-000004',
      journalDate: '2026-07-21T00:00:00.000Z',
      financialYearId: 'fy1',
      projectId: 'p1',
      sourceModule: 'project_finance',
      sourceEntityType: 'project_income',
      sourceEntityId: null,
      narration: financeRow.narration,
      status: JournalStatus.Posted,
      totalDebit: 2_050_000,
      totalCredit: 2_050_000,
      postedAt: null,
      postedBy: null,
      reversalOf: null,
      reversedBy: null,
      idempotencyKey: null,
      lines: [
        {
          id: 'l1',
          accountId: 'bank-acc',
          debit: 2_050_000,
          credit: 0,
          projectId: 'p1',
          blockId: null,
          costCentreId: null,
          boqItemId: null,
          partyType: null,
          partyId: null,
          fundingSource: null,
          description: null,
        },
        {
          id: 'l2',
          accountId: 'dir-acc',
          debit: 0,
          credit: 2_050_000,
          projectId: 'p1',
          blockId: null,
          costCentreId: null,
          boqItemId: null,
          partyType: JournalPartyType.Director,
          partyId: 'dir-4',
          fundingSource: null,
          description: null,
        },
      ],
    };

    const prefill = prefillFromFinanceJournal(journal, financeRow);
    expect(prefill.journalDate).toBe('2026-07-21');
    expect(prefill.amount).toBe(2_050_000);
    expect(prefill.bookKind).toBe('bank');
    expect(prefill.bookAccountId).toBe('bank-acc');
    expect(prefill.contraAccountId).toBe('dir-acc');
    expect(prefill.directorId).toBe('dir-4');
    expect(prefill.paymentMode).toBe('account_transfer');
    expect(prefill.paymentReference).toBe('RTGS-TMBLR5202607150');
    expect(prefill.narration).toBe('DIRECTOR APPROVAL');
  });

  it('formats and parses cash withdrawal payment narration', () => {
    expect(paymentNarrationPart('cash_withdrawal', '')).toBe('Cash withdrawal');
    expect(paymentNarrationPart('cash_withdrawal', 'ATM-991')).toBe(
      'Cash withdrawal · Slip / ATM ref. ATM-991',
    );

    const financeRow: ProjectFinanceRow = {
      id: 'r-wd',
      kind: 'transfer',
      book: 'bank',
      journalId: 'j-wd',
      journalNumber: 'JV-WD-1',
      journalDate: '2026-07-22T00:00:00.000Z',
      accountCode: '1110 → 1120',
      accountName: 'Bank → Cash',
      narration: 'Site float · Cash withdrawal · Slip / ATM ref. ATM-991',
      description: null,
      amount: 10_000,
      fromBook: 'bank',
      toBook: 'cash',
    };
    const journal: PublicJournalEntry = {
      id: 'j-wd',
      journalNumber: 'JV-WD-1',
      journalDate: '2026-07-22T00:00:00.000Z',
      financialYearId: 'fy1',
      projectId: 'p1',
      sourceModule: 'project_finance',
      sourceEntityType: 'project_transfer',
      sourceEntityId: null,
      narration: financeRow.narration,
      status: JournalStatus.Posted,
      totalDebit: 10_000,
      totalCredit: 10_000,
      postedAt: null,
      postedBy: null,
      reversalOf: null,
      reversedBy: null,
      idempotencyKey: null,
      lines: [
        {
          id: 'l1',
          accountId: 'bank-acc',
          debit: 0,
          credit: 10_000,
          projectId: 'p1',
          blockId: null,
          costCentreId: null,
          boqItemId: null,
          partyType: null,
          partyId: null,
          fundingSource: null,
          description: null,
        },
        {
          id: 'l2',
          accountId: 'cash-acc',
          debit: 10_000,
          credit: 0,
          projectId: 'p1',
          blockId: null,
          costCentreId: null,
          boqItemId: null,
          partyType: null,
          partyId: null,
          fundingSource: null,
          description: null,
        },
      ],
    };
    const prefill = prefillFromFinanceJournal(journal, financeRow);
    expect(prefill.paymentMode).toBe('cash_withdrawal');
    expect(prefill.paymentReference).toBe('ATM-991');
    expect(prefill.narration).toBe('Site float');
  });

  it('shows cheque/UPI/transfer in Ref. / Voucher, JV only for bare expenses', () => {
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
        kind: 'income',
        narration: 'Director loan · Cheque no. 877020',
      }),
    ).toBe('Cheque 877020');
    expect(
      financeRowVoucherLabel({
        ...base,
        kind: 'income',
        narration: 'Sale · UPI txn ID ABC123XYZ',
      }),
    ).toBe('UPI ABC123XYZ');
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
        kind: 'income',
        narration: 'Other income with no instrument',
      }),
    ).toBeNull();
    expect(
      financeRowVoucherLabel({
        ...base,
        kind: 'income',
        isCompanyCapital: true,
        narration: 'Share capital',
      }),
    ).toBeNull();
  });

  it('builds a project_transfer journal as Cr From / Dr To', () => {
    const journal = buildProjectTransferJournal({
      projectId: '507f1f77bcf86cd799439011',
      journalDate: '2026-07-22',
      amount: 50_000,
      narration: 'Cash withdrawal for site',
      fromAccountId: '507f1f77bcf86cd799439012',
      toAccountId: '507f1f77bcf86cd799439014',
    });
    expect(journal.sourceEntityType).toBe('project_transfer');
    expect(journal.sourceModule).toBe('project_finance');
    expect(journal.lines).toHaveLength(2);
    expect(journal.lines[0]).toMatchObject({
      accountId: '507f1f77bcf86cd799439012',
      debit: 0,
      credit: 50_000,
    });
    expect(journal.lines[1]).toMatchObject({
      accountId: '507f1f77bcf86cd799439014',
      debit: 50_000,
      credit: 0,
    });
  });

  it('maps and consolidates transfers without counting income/expense', () => {
    const bankLeg = row({
      journalId: 'xfer-1',
      journalNumber: 'JV-X-1',
      accountId: 'bank-1',
      accountCode: '1110',
      accountName: 'Bank Accounts',
      debit: 0,
      credit: 25_000,
      sourceModule: 'project_finance',
      sourceEntityType: 'project_transfer',
      narration: 'Cash withdrawal',
    });
    const cashLeg = row({
      journalId: 'xfer-1',
      journalNumber: 'JV-X-1',
      accountId: 'cash-1',
      accountCode: '1120',
      accountName: 'Cash',
      debit: 25_000,
      credit: 0,
      sourceModule: 'project_finance',
      sourceEntityType: 'project_transfer',
      narration: 'Cash withdrawal',
    });
    const income = row({
      journalId: 'in-1',
      journalNumber: 'JV-IN-1',
      debit: 10_000,
      credit: 0,
    });

    const bankRows = mapBookRowsToFinanceRows([bankLeg, income], 'bank');
    const cashRows = mapBookRowsToFinanceRows([cashLeg], 'cash');
    expect(bankRows.find((r) => r.journalId === 'xfer-1')?.kind).toBe(
      'transfer',
    );
    expect(cashRows[0]?.kind).toBe('transfer');

    const consolidated = consolidateTransferFinanceRows(
      mergeProjectFinanceRows(bankRows, cashRows),
    );
    const transferRows = consolidated.filter((r) => r.kind === 'transfer');
    expect(transferRows).toHaveLength(1);
    expect(transferRows[0]?.amount).toBe(25_000);
    expect(transferRows[0]?.accountCode).toBe('1110 → 1120');
    expect(financeRowTypeLabel(transferRows[0]!)).toBe('Transfer');
    expect(summariseFinanceRows(consolidated)).toEqual({
      income: 10_000,
      expense: 0,
      net: 10_000,
    });
  });
});
