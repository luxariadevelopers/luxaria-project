import { apiGet, apiPatch, apiPost } from '@/api/client';
import { fetchAccounts } from '@/chart-of-accounts/api';
import {
  AccountCategory,
  AccountStatus,
  type PublicAccount,
} from '@/chart-of-accounts/types';
import type {
  BankBalanceView,
  BankLedgerLine,
  BankLedgerQuery,
  CreateCompanyBankAccountInput,
  ListCompanyBankAccountsQuery,
  PaginatedBankAccounts,
  PaginatedBankLedger,
  PublicCompanyBankAccount,
  SetDefaultBankAccountInput,
  UpdateCompanyBankAccountInput,
} from './types';
import { toListSafeBankAccount } from './masking';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseBankAccount(
  row: PublicCompanyBankAccount,
): PublicCompanyBankAccount {
  return {
    ...row,
    branch: row.branch ?? null,
    accountNumber: row.accountNumber ?? null,
    projectId: row.projectId ?? null,
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedBankAccounts['meta'] {
  if (!meta) return null;
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}

/** `GET /company-bank-accounts` — `bank.view` (masked only). */
export async function fetchCompanyBankAccounts(
  query: ListCompanyBankAccountsQuery = {},
): Promise<PaginatedBankAccounts> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicCompanyBankAccount[]>(
    '/company-bank-accounts',
    {
      page,
      limit,
      status: query.status,
      projectId: query.projectId,
      companyOnly: query.companyOnly,
      search: query.search,
    },
  );
  return {
    items: (res.data ?? [])
      .map(normaliseBankAccount)
      .map(toListSafeBankAccount),
    meta: readMeta(res.meta, page, limit),
  };
}

/** `GET /company-bank-accounts/:id` — `bank.view` (+ sensitive if permitted). */
export async function fetchCompanyBankAccount(
  id: string,
): Promise<PublicCompanyBankAccount> {
  const res = await apiGet<PublicCompanyBankAccount>(
    `/company-bank-accounts/${id}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Bank account unavailable');
  }
  return normaliseBankAccount(res.data);
}

/** `POST /company-bank-accounts` — `bank.manage` */
export async function createCompanyBankAccount(
  input: CreateCompanyBankAccountInput,
): Promise<PublicCompanyBankAccount> {
  const res = await apiPost<PublicCompanyBankAccount>(
    '/company-bank-accounts',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Create bank account failed');
  }
  return normaliseBankAccount(res.data);
}

/** `PATCH /company-bank-accounts/:id` — `bank.manage` */
export async function updateCompanyBankAccount(
  id: string,
  input: UpdateCompanyBankAccountInput,
): Promise<PublicCompanyBankAccount> {
  const res = await apiPatch<PublicCompanyBankAccount>(
    `/company-bank-accounts/${id}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update bank account failed');
  }
  return normaliseBankAccount(res.data);
}

/** `POST /company-bank-accounts/:id/activate` — `bank.manage` */
export async function activateCompanyBankAccount(
  id: string,
): Promise<PublicCompanyBankAccount> {
  const res = await apiPost<PublicCompanyBankAccount>(
    `/company-bank-accounts/${id}/activate`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Activate bank account failed');
  }
  return normaliseBankAccount(res.data);
}

/** `POST /company-bank-accounts/:id/deactivate` — `bank.manage` */
export async function deactivateCompanyBankAccount(
  id: string,
): Promise<PublicCompanyBankAccount> {
  const res = await apiPost<PublicCompanyBankAccount>(
    `/company-bank-accounts/${id}/deactivate`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Deactivate bank account failed');
  }
  return normaliseBankAccount(res.data);
}

/** `POST /company-bank-accounts/:id/set-default` — `bank.manage` */
export async function setDefaultCompanyBankAccount(
  id: string,
  input: SetDefaultBankAccountInput = {},
): Promise<PublicCompanyBankAccount> {
  const res = await apiPost<PublicCompanyBankAccount>(
    `/company-bank-accounts/${id}/set-default`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Set default bank account failed');
  }
  return normaliseBankAccount(res.data);
}

/** `GET /company-bank-accounts/:id/balance` — `bank.view` */
export async function fetchCompanyBankAccountBalance(
  id: string,
): Promise<BankBalanceView> {
  const res = await apiGet<BankBalanceView>(
    `/company-bank-accounts/${id}/balance`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Bank balance unavailable');
  }
  return {
    ...res.data,
    asOf: toIso(res.data.asOf) ?? String(res.data.asOf),
  };
}

/** `GET /company-bank-accounts/:id/ledger` — `bank.view` */
export async function fetchCompanyBankAccountLedger(
  id: string,
  query: BankLedgerQuery = {},
): Promise<PaginatedBankLedger> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<BankLedgerLine[]>(
    `/company-bank-accounts/${id}/ledger`,
    {
      page,
      limit,
      from: query.from,
      to: query.to,
    },
  );
  const baseMeta = readMeta(res.meta, page, limit);
  return {
    items: (res.data ?? []).map((line) => ({
      ...line,
      journalDate: toIso(line.journalDate) ?? String(line.journalDate),
      description: line.description ?? null,
      projectId: line.projectId ?? null,
    })),
    meta: {
      ...(baseMeta ?? {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }),
      bankAccountId:
        typeof res.meta?.bankAccountId === 'string'
          ? res.meta.bankAccountId
          : undefined,
      accountCode:
        typeof res.meta?.accountCode === 'string'
          ? res.meta.accountCode
          : undefined,
      openingBalance:
        typeof res.meta?.openingBalance === 'number'
          ? res.meta.openingBalance
          : undefined,
    },
  };
}

/**
 * Active Bank-category COA accounts for ledger linkage.
 * `GET /accounts?accountCategory=bank` — `account.view`
 */
export async function fetchBankLedgerAccountOptions(): Promise<
  PublicAccount[]
> {
  return fetchAccounts({
    accountCategory: AccountCategory.Bank,
    status: AccountStatus.Active,
    limit: 100,
  });
}
