import { apiGet } from '@/api/client';
import { fetchAccounts } from '@/chart-of-accounts/api';
import {
  AccountCategory,
  AccountStatus,
  type PublicAccount,
} from '@/chart-of-accounts/types';
import { fetchFinancialYearFilterOptions } from '@/director-command-centre/api';
import type {
  AccountOption,
  AccountingBookKind,
  CashBankBookPayload,
  CashBankBookQuery,
  LedgerLineRow,
} from './types';

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normaliseRow(row: LedgerLineRow): LedgerLineRow {
  return {
    ...row,
    journalId: String(row.journalId),
    journalNumber: row.journalNumber,
    journalDate: String(row.journalDate),
    accountId: String(row.accountId),
    accountCode: row.accountCode ?? '',
    accountName: row.accountName ?? '',
    narration: row.narration ?? '',
    description: row.description ?? null,
    debit: toNumber(row.debit),
    credit: toNumber(row.credit),
    runningBalance: toNumber(row.runningBalance),
    projectId: row.projectId == null ? null : String(row.projectId),
    partyType: row.partyType ?? null,
    partyId: row.partyId == null ? null : String(row.partyId),
    sourceModule: row.sourceModule ?? null,
    sourceEntityType: row.sourceEntityType ?? null,
    sourceEntityId: row.sourceEntityId == null ? null : String(row.sourceEntityId),
    drillDown: Array.isArray(row.drillDown) ? row.drillDown : [],
  };
}

function normalisePayload(data: CashBankBookPayload): CashBankBookPayload {
  const rows = (data.rows ?? []).map(normaliseRow);
  const openingBalance = toNumber(data.openingBalance ?? data.totals?.openingBalance);
  const closingBalance = toNumber(data.closingBalance ?? data.totals?.closingBalance);
  const debit = toNumber(data.totals?.debit);
  const credit = toNumber(data.totals?.credit);
  return {
    meta: {
      ...data.meta,
      reconciled: Boolean(data.meta?.reconciled),
      reconciliationNotes: data.meta?.reconciliationNotes ?? [],
    },
    openingBalance,
    closingBalance,
    rows,
    totals: {
      debit,
      credit,
      openingBalance: toNumber(data.totals?.openingBalance ?? openingBalance),
      closingBalance: toNumber(data.totals?.closingBalance ?? closingBalance),
    },
  };
}

/** `GET /accounting-reports/:reportType` — Nest `report.view`. */
export async function fetchCashBankBook(
  kind: AccountingBookKind,
  query: CashBankBookQuery = {},
): Promise<CashBankBookPayload> {
  const res = await apiGet<CashBankBookPayload>(`/accounting-reports/${kind}`, {
    financialYearId: query.financialYearId || undefined,
    projectId: query.projectId || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
    accountId: query.accountId || undefined,
  });
  if (!res.data) {
    throw new Error(res.message || `${kind} unavailable`);
  }
  return normalisePayload(res.data);
}

const CASH_CATEGORIES = [
  AccountCategory.Cash,
  AccountCategory.PettyCash,
] as const;

/** Chart accounts for the book account selector — Nest `account.view`. */
export async function fetchBookAccountOptions(
  kind: AccountingBookKind,
): Promise<AccountOption[]> {
  if (kind === 'bank-book') {
    const accounts = await fetchAccounts({
      page: 1,
      limit: 200,
      status: AccountStatus.Active,
      accountCategory: AccountCategory.Bank,
    });
    return accounts.map(toOption);
  }

  const [cash, petty] = await Promise.all([
    fetchAccounts({
      page: 1,
      limit: 200,
      status: AccountStatus.Active,
      accountCategory: CASH_CATEGORIES[0],
    }),
    fetchAccounts({
      page: 1,
      limit: 200,
      status: AccountStatus.Active,
      accountCategory: CASH_CATEGORIES[1],
    }),
  ]);
  const byId = new Map<string, PublicAccount>();
  for (const account of [...cash, ...petty]) {
    byId.set(account.id, account);
  }
  return [...byId.values()]
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
    .map(toOption);
}

function toOption(account: PublicAccount): AccountOption {
  return {
    id: account.id,
    accountCode: account.accountCode,
    accountName: account.accountName,
    accountCategory: account.accountCategory,
  };
}

export { fetchFinancialYearFilterOptions };
