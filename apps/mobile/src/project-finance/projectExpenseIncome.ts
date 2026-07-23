import {
  JournalFundingSource,
  JournalPartyType,
  type CreateJournalInput,
  type PublicJournalEntry,
} from '@/journals/types';
import {
  AccountCategory,
  type LedgerLineRow,
  type ProjectFinanceEntryKind,
} from './types';

export type ProjectCashBookKind = 'bank' | 'cash';

export type { ProjectFinanceEntryKind };

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
  isCompanyCapital?: boolean;
  isLoanIncome?: boolean;
  directorId?: string | null;
  directorName?: string | null;
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
  return (
    funding === JournalFundingSource.Director ||
    funding === JournalFundingSource.Investor ||
    funding === JournalFundingSource.Loan
  );
}

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

export function mapBookRowsToFinanceRows(
  rows: readonly LedgerLineRow[],
  book: ProjectCashBookKind,
  options?: {
    includeCompanyCapitalOnly?: boolean;
    excludeCompanyCapital?: boolean;
  },
): ProjectFinanceRow[] {
  const mapped: Array<ProjectFinanceRow | null> = rows.map((row) => {
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
  });
  return mapped.filter((row): row is ProjectFinanceRow => row != null);
}

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
    const from = group.find((row) => row.transferLeg === 'from') ?? group[0];
    const to =
      group.find((row) => row.transferLeg === 'to') ??
      group.find((row) => row.id !== from?.id) ??
      from;
    if (!from) continue;
    const amount = from.amount || to?.amount || 0;
    const fromLabel = `${from.accountCode} · ${from.accountName}`;
    const toLabel = to ? `${to.accountCode} · ${to.accountName}` : '—';
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
      description: from.description || `Transfer ${fromLabel} → ${toLabel}`,
      amount,
      fromBook: from.book,
      toBook: to?.book ?? from.book,
    });
  }

  return [...others, ...consolidated];
}

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
      const directorName = directorNamesById.get(directorId) ?? 'Director';
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
  let capitalIncome = 0;
  let loanIncome = 0;
  for (const row of rows) {
    if (row.kind === 'transfer') continue;
    if (row.kind === 'income') {
      income += row.amount;
      if (row.isCompanyCapital) capitalIncome += row.amount;
      else if (row.isLoanIncome) loanIncome += row.amount;
    } else if (row.kind === 'expense') {
      expense += row.amount;
    }
  }
  return {
    income,
    expense,
    net: income - expense,
    capitalIncome,
    loanIncome,
    otherIncome: income - capitalIncome - loanIncome,
  };
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
      return null;
    default:
      return null;
  }
}

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
  if (/cash withdrawal/i.test(narration) || withdrawalSlip?.[1]?.trim()) {
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

/** Ref. / Voucher: instrument when present; JV only for uninstrumented expenses. */
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

/** Build balanced 2-line journal for bank/cash transfer (Cr From / Dr To). */
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
