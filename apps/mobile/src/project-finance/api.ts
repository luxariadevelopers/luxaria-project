import { apiGet, apiPost } from '@/api/client';
import type {
  CashBankBookPayload,
  CreateAccountInput,
  CreateCostCentreInput,
  FinancialYearOption,
  LedgerLineRow,
  PublicAccount,
  PublicCostCentre,
} from './types';
import { AccountCategory, AccountStatus } from './types';

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
    fundingSource: row.fundingSource ?? null,
    sourceModule: row.sourceModule ?? null,
    sourceEntityType: row.sourceEntityType ?? null,
    sourceEntityId:
      row.sourceEntityId == null ? null : String(row.sourceEntityId),
  };
}

function normalisePayload(data: CashBankBookPayload): CashBankBookPayload {
  const rows = (data.rows ?? []).map(normaliseRow);
  const openingBalance = toNumber(
    data.openingBalance ?? data.totals?.openingBalance,
  );
  const closingBalance = toNumber(
    data.closingBalance ?? data.totals?.closingBalance,
  );
  return {
    openingBalance,
    closingBalance,
    rows,
    totals: {
      debit: toNumber(data.totals?.debit),
      credit: toNumber(data.totals?.credit),
      openingBalance: toNumber(
        data.totals?.openingBalance ?? openingBalance,
      ),
      closingBalance: toNumber(
        data.totals?.closingBalance ?? closingBalance,
      ),
    },
  };
}

/** `GET /financial-years` — current FY picker */
export async function fetchFinancialYearOptions(): Promise<
  FinancialYearOption[]
> {
  const res = await apiGet<
    Array<{
      id: string;
      name: string;
      isCurrent?: boolean;
      isLocked?: boolean;
    }>
  >('/financial-years', { page: 1, limit: 50 });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    isCurrent: Boolean(row.isCurrent),
    isLocked: Boolean(row.isLocked),
  }));
}

/** `GET /accounting-reports/:kind` — `report.view` */
export async function fetchCashBankBook(
  kind: 'bank-book' | 'cash-book',
  query: {
    financialYearId?: string;
    projectId?: string;
    from?: string;
    to?: string;
    accountId?: string;
  } = {},
): Promise<CashBankBookPayload> {
  const res = await apiGet<CashBankBookPayload>(`/accounting-reports/${kind}`, {
    financialYearId: query.financialYearId || undefined,
    projectId: query.projectId || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
    accountId: query.accountId || undefined,
  });
  if (!res.data) throw new Error(res.message || `${kind} unavailable`);
  return normalisePayload(res.data);
}

/** `GET /accounts` — `account.view` */
export async function fetchAccounts(params: {
  accountCategory?: string;
  accountType?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PublicAccount[]> {
  const res = await apiGet<PublicAccount[]>('/accounts', {
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    accountCategory: params.accountCategory,
    accountType: params.accountType,
    status: params.status ?? AccountStatus.Active,
  });
  return res.data ?? [];
}

export async function fetchBookAccounts(
  kind: 'bank' | 'cash',
): Promise<PublicAccount[]> {
  if (kind === 'bank') {
    return fetchAccounts({ accountCategory: AccountCategory.Bank });
  }
  const [cash, petty] = await Promise.all([
    fetchAccounts({ accountCategory: AccountCategory.Cash }),
    fetchAccounts({ accountCategory: AccountCategory.PettyCash }),
  ]);
  return [...cash, ...petty];
}

/** `POST /accounts` — `account.manage` */
export async function createAccount(
  input: CreateAccountInput,
): Promise<PublicAccount> {
  const res = await apiPost<PublicAccount>('/accounts', input);
  if (!res.data) throw new Error(res.message || 'Create account failed');
  return res.data;
}

/** `POST /cost-centres` — `cost_centre.manage` */
export async function createCostCentre(
  input: CreateCostCentreInput,
): Promise<PublicCostCentre> {
  const res = await apiPost<PublicCostCentre>('/cost-centres', {
    code: input.code.trim(),
    name: input.name.trim(),
    kind: input.kind,
    projectId: input.projectId || undefined,
    notes: input.notes?.trim() || undefined,
  });
  if (!res.data) throw new Error(res.message || 'Cost centre was not created');
  return res.data;
}

/** `GET /cost-centres` — `cost_centre.view` */
export async function fetchCostCentres(params: {
  /** When set, returns company-wide + this project's centres. */
  projectId?: string;
  page?: number;
  limit?: number;
}): Promise<PublicCostCentre[]> {
  const res = await apiGet<PublicCostCentre[]>('/cost-centres', {
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    status: 'active',
    kind: 'cost_centre',
  });
  const rows = res.data ?? [];
  if (!params.projectId) return rows;
  return rows.filter(
    (row) => !row.projectId || row.projectId === params.projectId,
  );
}
