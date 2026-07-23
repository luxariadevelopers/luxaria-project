import type { LedgerLineRow } from '@/reports/accounting/types';
import type {
  CreateJournalInput,
  PublicJournalEntry,
} from '@/journals/types';
import {
  JournalFundingSource,
  JournalPartyType,
} from '@/journals/types';
import { AccountCategory } from '@/chart-of-accounts/types';

export type ProjectCashBookKind = 'bank' | 'cash';

export type ProjectFinanceEntryKind = 'income' | 'expense' | 'transfer';

/** Which side of a bank/cash transfer this ledger line is on. */
export type ProjectTransferLeg = 'from' | 'to';

export type ProjectFinanceRow = {
  id: string;
  kind: ProjectFinanceEntryKind;
  book: ProjectCashBookKind;
  journalId: string;
  journalNumber: string;
  journalDate: string;
  accountCode: string;
  accountName: string;
  narration: string;
  description: string | null;
  amount: number;
  /** Company share capital shown as the project's opening capital income. */
  isCompanyCapital?: boolean;
  /** Director / investor / external loan receipt into the project. */
  isLoanIncome?: boolean;
  directorId?: string | null;
  directorName?: string | null;
  /** Present on unconsolidated transfer legs before consolidateTransferFinanceRows. */
  transferLeg?: ProjectTransferLeg;
  fromBook?: ProjectCashBookKind;
  toBook?: ProjectCashBookKind;
};

export function isProjectTransferLedgerRow(row: LedgerLineRow): boolean {
  return row.sourceEntityType === 'project_transfer';
}

export function isCompanyShareCapitalRow(row: LedgerLineRow): boolean {
  return (
    row.sourceModule === 'share_capital' ||
    row.sourceEntityType === 'company_share_capital'
  );
}

/** Project bank/cash income that is a loan (director, investor, or external). */
export function isLoanIncomeLedgerRow(
  row: LedgerLineRow,
  isIncome: boolean,
): boolean {
  if (!isIncome || isCompanyShareCapitalRow(row)) return false;
  const text = `${row.narration ?? ''} ${row.description ?? ''}`.toLowerCase();
  if (
    text.includes('director loan') ||
    text.includes('investor loan') ||
    text.includes('secured loan') ||
    text.includes('unsecured loan') ||
    text.includes('external loan')
  ) {
    return true;
  }
  const funding = String(row.fundingSource ?? '').toLowerCase();
  if (
    funding === JournalFundingSource.Director ||
    funding === JournalFundingSource.Investor ||
    funding === JournalFundingSource.Loan
  ) {
    return true;
  }
  return false;
}

/** Display label for the Type column on Expense & income. */
export function financeRowTypeLabel(row: ProjectFinanceRow): string {
  if (row.isCompanyCapital) {
    return row.directorName
      ? `Capital · ${row.directorName}`
      : 'Capital income';
  }
  if (row.kind === 'transfer') return 'Transfer';
  if (row.kind === 'expense') return 'Expense';
  if (row.isLoanIncome) return 'Loan income';
  return 'Income';
}

/** Bank/cash book debit = money in; credit = money out. */
export function mapBookRowsToFinanceRows(
  rows: readonly LedgerLineRow[],
  book: ProjectCashBookKind,
  options?: { includeCompanyCapitalOnly?: boolean; excludeCompanyCapital?: boolean },
): ProjectFinanceRow[] {
  return rows
    .map((row) => {
      // Reversal vouchers net out a prior entry — hide from this register.
      if (row.sourceEntityType === 'journal_reversal') return null;
      const isCapital = isCompanyShareCapitalRow(row);
      if (options?.includeCompanyCapitalOnly && !isCapital) return null;
      if (options?.excludeCompanyCapital && isCapital) return null;
      const income = row.debit > 0;
      const expense = row.credit > 0;
      if (!income && !expense) return null;
      const isTransfer = isProjectTransferLedgerRow(row);
      return {
        id: `${book}-${row.journalId}-${row.accountId}-${row.journalDate}-${row.debit}-${row.credit}`,
        kind: (isTransfer
          ? 'transfer'
          : income
            ? 'income'
            : 'expense') as ProjectFinanceEntryKind,
        book,
        journalId: row.journalId,
        journalNumber: row.journalNumber,
        journalDate: row.journalDate,
        accountCode: row.accountCode,
        accountName: row.accountName,
        narration: row.narration,
        description: row.description,
        amount: income ? row.debit : row.credit,
        isCompanyCapital: isCapital,
        isLoanIncome: isTransfer
          ? false
          : isLoanIncomeLedgerRow(row, income),
        transferLeg: isTransfer
          ? ((income ? 'to' : 'from') as ProjectTransferLeg)
          : undefined,
      };
    })
    .filter((row): row is ProjectFinanceRow => row != null);
}

/**
 * Collapse paired From/To transfer legs (same journal) into one register row.
 */
export function consolidateTransferFinanceRows(
  rows: readonly ProjectFinanceRow[],
): ProjectFinanceRow[] {
  const transferGroups = new Map<string, ProjectFinanceRow[]>();
  const others: ProjectFinanceRow[] = [];
  for (const row of rows) {
    if (row.kind === 'transfer') {
      const group = transferGroups.get(row.journalId) ?? [];
      group.push(row);
      transferGroups.set(row.journalId, group);
    } else {
      others.push(row);
    }
  }

  const consolidated: ProjectFinanceRow[] = [];
  for (const [journalId, group] of transferGroups) {
    const from =
      group.find((row) => row.transferLeg === 'from') ?? group[0];
    const to =
      group.find((row) => row.transferLeg === 'to') ??
      group.find((row) => row.id !== from?.id) ??
      from;
    if (!from) continue;
    const amount = from.amount || to?.amount || 0;
    const fromLabel = `${from.accountCode} · ${from.accountName}`;
    const toLabel = to
      ? `${to.accountCode} · ${to.accountName}`
      : '—';
    consolidated.push({
      id: `transfer-${journalId}`,
      kind: 'transfer',
      book: from.book,
      journalId,
      journalNumber: from.journalNumber,
      journalDate: from.journalDate,
      accountCode: to
        ? `${from.accountCode} → ${to.accountCode}`
        : from.accountCode,
      accountName: to
        ? `${from.accountName} → ${to.accountName}`
        : from.accountName,
      narration: from.narration,
      description:
        from.description ||
        `Transfer ${fromLabel} → ${toLabel}`,
      amount,
      fromBook: from.book,
      toBook: to?.book ?? from.book,
    });
  }

  return [...others, ...consolidated];
}

/** Merge project bank/cash rows with company share-capital income (oldest first by date). */
export function mergeProjectFinanceRows(
  ...groups: readonly (readonly ProjectFinanceRow[])[]
): ProjectFinanceRow[] {
  const seen = new Set<string>();
  const merged: ProjectFinanceRow[] = [];
  for (const group of groups) {
    for (const row of group) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
  }
  return merged.sort((a, b) => {
    const byDate = b.journalDate.localeCompare(a.journalDate);
    if (byDate !== 0) return byDate;
    return b.journalNumber.localeCompare(a.journalNumber);
  });
}

/**
 * Split a company share-capital bank debit into one income row per director
 * (credit lines on the journal), labelled with the director name.
 */
export function expandShareCapitalByDirector(
  bankCapitalRows: readonly ProjectFinanceRow[],
  journalsById: ReadonlyMap<string, PublicJournalEntry>,
  directorNamesById: ReadonlyMap<string, string>,
): ProjectFinanceRow[] {
  const out: ProjectFinanceRow[] = [];
  for (const bankRow of bankCapitalRows) {
    const journal = journalsById.get(bankRow.journalId);
    if (!journal) {
      out.push(bankRow);
      continue;
    }
    const directorLines = journal.lines.filter(
      (line) =>
        line.partyType === JournalPartyType.Director &&
        Boolean(line.partyId) &&
        line.credit > 0,
    );
    if (directorLines.length === 0) {
      out.push(bankRow);
      continue;
    }
    for (const line of directorLines) {
      const directorId = String(line.partyId);
      const directorName =
        directorNamesById.get(directorId) ?? 'Director';
      const label = `Capital income — ${directorName}`;
      out.push({
        ...bankRow,
        id: `${bankRow.journalId}-capital-${directorId}-${line.credit}`,
        amount: line.credit,
        narration: label,
        description: line.description
          ? `${label} (${line.description})`
          : label,
        isCompanyCapital: true,
        directorId,
        directorName,
      });
    }
  }
  return out;
}

export function summariseFinanceRows(rows: readonly ProjectFinanceRow[]) {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.kind === 'transfer') continue;
    if (row.kind === 'income') income += row.amount;
    else if (row.kind === 'expense') expense += row.amount;
  }
  return { income, expense, net: income - expense };
}

export type ProjectFinanceEntryInput = {
  projectId: string;
  journalDate: string;
  amount: number;
  narration: string;
  bookAccountId: string;
  contraAccountId: string;
  kind: Exclude<ProjectFinanceEntryKind, 'transfer'>;
  fundingSource?: JournalFundingSource | null;
  partyType?: JournalPartyType | null;
  partyId?: string | null;
  /** Optional tag for spend analysis (e.g. Footing, Civil). */
  costCentreId?: string | null;
};

export type ProjectTransferEntryInput = {
  projectId: string;
  journalDate: string;
  amount: number;
  narration: string;
  fromAccountId: string;
  toAccountId: string;
};

/** Plain-language labels for income contra accounts in the project form. */
export function incomeAccountOptionLabel(account: {
  accountCode: string;
  accountName: string;
  accountCategory: string;
}): string {
  switch (account.accountCategory) {
    case AccountCategory.DirectorAccount:
      return `${account.accountCode} — From director (loan to project)`;
    case AccountCategory.InvestorAccount:
      return `${account.accountCode} — From investor (loan to project)`;
    case AccountCategory.Loan:
      return `${account.accountCode} — External loan (bank / 3rd party)`;
    case AccountCategory.Sales:
      return `${account.accountCode} — Sale income (pick client)`;
    case AccountCategory.OtherIncome:
      return `${account.accountCode} — Other income (say from where)`;
    default:
      return `${account.accountCode} — ${account.accountName}`;
  }
}

/**
 * Labels for expense / repayment contra accounts.
 * Cost accounts show their real name (Auditor fee, Rent, …).
 * Loan / interest liability accounts keep a clear “repay / interest paid” wording.
 */
export function expenseAccountOptionLabel(account: {
  accountCode: string;
  accountName: string;
  accountCategory: string;
  accountType?: string;
}): string {
  switch (account.accountCategory) {
    case AccountCategory.DirectorAccount:
      return `${account.accountCode} — Repay director loan (principal)`;
    case AccountCategory.InvestorAccount:
      return `${account.accountCode} — Repay investor loan (principal)`;
    case AccountCategory.Loan:
      return `${account.accountCode} — Repay external loan (principal)`;
    case AccountCategory.Interest:
      // Category is shared: 4300 Interest Income vs 5400 Interest Expense.
      if (account.accountType === 'income') {
        return `${account.accountCode} — Interest income (do not use for payments)`;
      }
      return `${account.accountCode} — ${account.accountName} (interest paid)`;
    default:
      return `${account.accountCode} — ${account.accountName}`;
  }
}

export type LoanSecurityKind = 'secured' | 'unsecured';
export type LoanLenderKind = 'bank' | 'third_party';

export function formatExternalLoanNarration(details: {
  security: LoanSecurityKind;
  hasInterest: boolean;
  interestRate?: number | null;
  lenderKind?: LoanLenderKind | null;
  lenderName?: string | null;
}): string {
  const parts: string[] = [
    details.security === 'secured' ? 'Secured loan' : 'Unsecured loan',
  ];
  if (details.lenderKind === 'bank') {
    parts.push(
      details.lenderName?.trim()
        ? `From bank: ${details.lenderName.trim()}`
        : 'From bank',
    );
  } else if (details.lenderKind === 'third_party') {
    parts.push(
      details.lenderName?.trim()
        ? `From 3rd party: ${details.lenderName.trim()}`
        : 'From 3rd party',
    );
  }
  if (details.hasInterest) {
    if (
      details.interestRate != null &&
      Number.isFinite(details.interestRate)
    ) {
      parts.push(`Interest ${details.interestRate}% p.a.`);
    } else {
      parts.push('With interest');
    }
  } else {
    parts.push('Without interest');
  }
  return parts.join(' · ');
}

export function resolveIncomeFundingSource(
  accountCategory: string | undefined,
): JournalFundingSource {
  switch (accountCategory) {
    case AccountCategory.DirectorAccount:
      return JournalFundingSource.Director;
    case AccountCategory.InvestorAccount:
      return JournalFundingSource.Investor;
    case AccountCategory.Loan:
      return JournalFundingSource.Loan;
    case AccountCategory.Sales:
      return JournalFundingSource.ProjectFunds;
    case AccountCategory.OtherIncome:
      return JournalFundingSource.Other;
    default:
      return JournalFundingSource.ProjectFunds;
  }
}

/** Funding source for expense / repayment postings. */
export function resolveExpenseFundingSource(
  accountCategory: string | undefined,
): JournalFundingSource {
  switch (accountCategory) {
    case AccountCategory.DirectorAccount:
      return JournalFundingSource.Director;
    case AccountCategory.InvestorAccount:
      return JournalFundingSource.Investor;
    case AccountCategory.Loan:
      return JournalFundingSource.Loan;
    default:
      return JournalFundingSource.ProjectFunds;
  }
}

export function resolveIncomePartyType(
  accountCategory: string | undefined,
): JournalPartyType | null {
  switch (accountCategory) {
    case AccountCategory.DirectorAccount:
      return JournalPartyType.Director;
    case AccountCategory.InvestorAccount:
      return JournalPartyType.Investor;
    case AccountCategory.Sales:
      return JournalPartyType.Customer;
    case AccountCategory.Loan:
      // External bank / 3rd-party loan — details go in narration, not party.
      return null;
    default:
      return null;
  }
}

export type ProjectFinanceFormPrefill = {
  journalDate: string;
  bookKind: ProjectCashBookKind;
  /** Destination book for transfers (ignored for income/expense). */
  toBookKind: ProjectCashBookKind;
  bookAccountId: string;
  contraAccountId: string;
  amount: number;
  narration: string;
  customerId: string;
  directorId: string;
  investorId: string;
  loanSecurity: '' | 'secured' | 'unsecured';
  loanFrom: '' | 'bank' | 'third_party';
  loanLenderName: string;
  loanHasInterest: '' | 'yes' | 'no';
  loanInterestRate: number | undefined;
  paymentMode: '' | 'cheque' | 'account_transfer' | 'upi' | 'cash_withdrawal';
  paymentReference: string;
  incomeSource: string;
  costCentreId: string;
};

function parsePaymentFromNarration(narration: string): {
  paymentMode: '' | 'cheque' | 'account_transfer' | 'upi' | 'cash_withdrawal';
  paymentReference: string;
} {
  const cheque = narration.match(/Cheque no\.\s*(.+?)(?:\s*·|$)/i);
  if (cheque?.[1]?.trim()) {
    return { paymentMode: 'cheque', paymentReference: cheque[1].trim() };
  }
  const upi = narration.match(/UPI txn ID\s*(.+?)(?:\s*·|$)/i);
  if (upi?.[1]?.trim()) {
    return { paymentMode: 'upi', paymentReference: upi[1].trim() };
  }
  const transfer = narration.match(/Transfer ref\.\s*(.+?)(?:\s*·|$)/i);
  if (transfer?.[1]?.trim()) {
    return {
      paymentMode: 'account_transfer',
      paymentReference: transfer[1].trim(),
    };
  }
  const withdrawalSlip = narration.match(
    /(?:Cash withdrawal(?:\s*·\s*)?)?(?:Slip \/ ATM ref\.|Withdrawal ref\.)\s*(.+?)(?:\s*·|$)/i,
  );
  if (
    /cash withdrawal/i.test(narration) ||
    withdrawalSlip?.[1]?.trim()
  ) {
    return {
      paymentMode: 'cash_withdrawal',
      paymentReference: withdrawalSlip?.[1]?.trim() ?? '',
    };
  }
  return { paymentMode: '', paymentReference: '' };
}

export function paymentNarrationPart(
  mode: string,
  reference: string,
): string | null {
  const ref = reference.trim();
  switch (mode) {
    case 'cheque':
      return ref ? `Cheque no. ${ref}` : null;
    case 'upi':
      return ref ? `UPI txn ID ${ref}` : null;
    case 'account_transfer':
      return ref ? `Transfer ref. ${ref}` : null;
    case 'cash_withdrawal':
      return ref
        ? `Cash withdrawal · Slip / ATM ref. ${ref}`
        : 'Cash withdrawal';
    default:
      return null;
  }
}

function truncatePaymentRef(ref: string, max = 40): string {
  const trimmed = ref.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

/**
 * Bank instrument identity from narration (cheque / UPI / NEFT / withdrawal).
 * Used by the Expense & income Ref. / Voucher column.
 */
export function financeRowPaymentInstrumentLabel(
  narration: string | null | undefined,
): string | null {
  const payment = parsePaymentFromNarration(narration ?? '');
  const ref = payment.paymentReference.trim();
  switch (payment.paymentMode) {
    case 'cheque':
      return ref ? `Cheque ${truncatePaymentRef(ref)}` : null;
    case 'upi':
      return ref ? `UPI ${truncatePaymentRef(ref)}` : null;
    case 'account_transfer':
      return ref ? `Transfer ${truncatePaymentRef(ref)}` : null;
    case 'cash_withdrawal':
      return ref ? `Withdrawal ${truncatePaymentRef(ref)}` : 'Cash withdrawal';
    default:
      return null;
  }
}

/**
 * Register display for Ref. / Voucher:
 * - cheque / UPI / transfer / withdrawal ref when present
 * - JV only for uninstrumented expenses (labour / small cash)
 * - otherwise null (show em dash) — income, transfer, capital
 */
export function financeRowVoucherLabel(
  row: Pick<
    ProjectFinanceRow,
    'kind' | 'journalNumber' | 'narration' | 'isCompanyCapital'
  >,
): string | null {
  const instrument = financeRowPaymentInstrumentLabel(row.narration);
  if (instrument) return instrument;
  if (row.isCompanyCapital || row.kind !== 'expense') return null;
  const jv = row.journalNumber?.trim();
  return jv || null;
}

function stripAutoNarrationParts(narration: string): string {
  return narration
    .split(/\s*·\s*/)
    .filter((part) => {
      const p = part.trim().toLowerCase();
      if (!p) return false;
      if (p.startsWith('director loan:')) return false;
      if (p.startsWith('investor loan:')) return false;
      if (p.startsWith('client:')) return false;
      if (p.startsWith('from:')) return false;
      if (p.startsWith('cheque no.')) return false;
      if (p.startsWith('upi txn id')) return false;
      if (p.startsWith('transfer ref.')) return false;
      if (p === 'cash withdrawal' || p.startsWith('cash withdrawal')) {
        return false;
      }
      if (p.startsWith('slip / atm ref.') || p.startsWith('withdrawal ref.')) {
        return false;
      }
      if (p.startsWith('secured loan') || p.startsWith('unsecured loan')) {
        return false;
      }
      return true;
    })
    .join(' · ')
    .trim();
}

/**
 * Prefill Add income/expense/transfer form from an existing posted finance journal.
 */
export function prefillFromFinanceJournal(
  journal: PublicJournalEntry,
  row: ProjectFinanceRow,
): ProjectFinanceFormPrefill {
  const amount = row.amount;
  const payment = parsePaymentFromNarration(journal.narration ?? '');

  if (row.kind === 'transfer') {
    const fromLine = journal.lines.find((line) => line.credit === amount);
    const toLine = journal.lines.find((line) => line.debit === amount);
    const baseNarration =
      stripAutoNarrationParts(journal.narration ?? '') ||
      'Project bank/cash transfer';
    return {
      journalDate: (journal.journalDate || row.journalDate).slice(0, 10),
      bookKind: row.fromBook ?? row.book,
      toBookKind: row.toBook ?? (row.fromBook === 'bank' ? 'cash' : 'bank'),
      bookAccountId: fromLine?.accountId ? String(fromLine.accountId) : '',
      contraAccountId: toLine?.accountId ? String(toLine.accountId) : '',
      amount,
      narration: baseNarration,
      customerId: '',
      directorId: '',
      investorId: '',
      loanSecurity: '',
      loanFrom: '',
      loanLenderName: '',
      loanHasInterest: '',
      loanInterestRate: undefined,
      paymentMode: payment.paymentMode,
      paymentReference: payment.paymentReference,
      incomeSource: '',
      costCentreId: '',
    };
  }

  const income = row.kind === 'income';
  const bookLine = journal.lines.find((line) =>
    income ? line.debit === amount : line.credit === amount,
  );
  const contraLine = journal.lines.find((line) =>
    income ? line.credit === amount : line.debit === amount,
  );
  const partyType = contraLine?.partyType ?? null;
  const partyId = contraLine?.partyId ? String(contraLine.partyId) : '';
  const costCentreId = String(
    contraLine?.costCentreId ?? bookLine?.costCentreId ?? '',
  );
  const baseNarration =
    stripAutoNarrationParts(journal.narration ?? '') ||
    (income ? 'Project bank/cash income' : 'Project bank/cash expense');

  return {
    journalDate: (journal.journalDate || row.journalDate).slice(0, 10),
    bookKind: row.book,
    toBookKind: row.book === 'bank' ? 'cash' : 'bank',
    bookAccountId: bookLine?.accountId ? String(bookLine.accountId) : '',
    contraAccountId: contraLine?.accountId ? String(contraLine.accountId) : '',
    amount,
    narration: baseNarration,
    customerId: partyType === JournalPartyType.Customer ? partyId : '',
    directorId: partyType === JournalPartyType.Director ? partyId : '',
    investorId: partyType === JournalPartyType.Investor ? partyId : '',
    loanSecurity: '',
    loanFrom: '',
    loanLenderName: '',
    loanHasInterest: '',
    loanInterestRate: undefined,
    paymentMode: payment.paymentMode,
    paymentReference: payment.paymentReference,
    incomeSource: '',
    costCentreId,
  };
}

/** Build balanced 2-line journal for project bank/cash income or expense. */
export function buildProjectFinanceJournal(
  input: ProjectFinanceEntryInput,
  options?: { post?: boolean },
): CreateJournalInput {
  const amount = input.amount;
  const projectId = input.projectId;
  const description = input.narration.trim();
  const fundingSource =
    input.fundingSource ?? JournalFundingSource.ProjectFunds;
  const costCentreId = input.costCentreId ?? null;

  const bookLine = {
    accountId: input.bookAccountId,
    projectId,
    description,
    fundingSource,
    costCentreId,
    ...(input.kind === 'income'
      ? { debit: amount, credit: 0 }
      : { debit: 0, credit: amount }),
  };

  const contraLine = {
    accountId: input.contraAccountId,
    projectId,
    description,
    fundingSource,
    costCentreId,
    partyType: input.partyType ?? null,
    partyId: input.partyId ?? null,
    ...(input.kind === 'income'
      ? { debit: 0, credit: amount }
      : { debit: amount, credit: 0 }),
  };

  return {
    journalDate: input.journalDate,
    narration: description,
    projectId,
    sourceModule: 'project_finance',
    sourceEntityType:
      input.kind === 'income' ? 'project_income' : 'project_expense',
    lines: [bookLine, contraLine],
    post: options?.post ?? false,
  };
}

/**
 * Build balanced 2-line journal for bank/cash transfer (Cr From / Dr To).
 */
export function buildProjectTransferJournal(
  input: ProjectTransferEntryInput,
  options?: { post?: boolean },
): CreateJournalInput {
  const amount = input.amount;
  const projectId = input.projectId;
  const description = input.narration.trim();
  const fundingSource = JournalFundingSource.ProjectFunds;

  return {
    journalDate: input.journalDate,
    narration: description,
    projectId,
    sourceModule: 'project_finance',
    sourceEntityType: 'project_transfer',
    lines: [
      {
        accountId: input.fromAccountId,
        projectId,
        description,
        fundingSource,
        debit: 0,
        credit: amount,
      },
      {
        accountId: input.toAccountId,
        projectId,
        description,
        fundingSource,
        debit: amount,
        credit: 0,
      },
    ],
    post: options?.post ?? false,
  };
}
