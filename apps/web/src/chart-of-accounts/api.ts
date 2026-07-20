import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  AccountTreeNode,
  CreateAccountInput,
  ListAccountsQuery,
  PublicAccount,
  SeedStandardResult,
  UpdateAccountInput,
} from './types';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseAccount(row: PublicAccount): PublicAccount {
  return {
    ...row,
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function normaliseTree(nodes: AccountTreeNode[]): AccountTreeNode[] {
  return nodes.map((n) => ({
    ...normaliseAccount(n),
    children: normaliseTree(n.children ?? []),
  }));
}

/** `GET /accounts/tree` — `account.view` */
export async function fetchAccountTree(status?: string): Promise<AccountTreeNode[]> {
  const res = await apiGet<AccountTreeNode[]>('/accounts/tree', {
    status: status || undefined,
  });
  return normaliseTree(res.data ?? []);
}

/** `GET /accounts` — `account.view` */
export async function fetchAccounts(
  query: ListAccountsQuery = {},
): Promise<PublicAccount[]> {
  const res = await apiGet<PublicAccount[]>('/accounts', {
    page: query.page ?? 1,
    limit: query.limit ?? 200,
    accountType: query.accountType,
    accountCategory: query.accountCategory,
    status: query.status,
    search: query.search,
    parentAccountId: query.parentAccountId,
    rootsOnly: query.rootsOnly,
  });
  return (res.data ?? []).map(normaliseAccount);
}

/** `GET /accounts/:id` — `account.view` */
export async function fetchAccount(id: string): Promise<PublicAccount> {
  const res = await apiGet<PublicAccount>(`/accounts/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Account unavailable');
  }
  return normaliseAccount(res.data);
}

/** `POST /accounts` — `account.manage` */
export async function createAccount(
  input: CreateAccountInput,
): Promise<PublicAccount> {
  const res = await apiPost<PublicAccount>('/accounts', input);
  if (!res.data) {
    throw new Error(res.message || 'Create account failed');
  }
  return normaliseAccount(res.data);
}

/** `PATCH /accounts/:id` — `account.manage` */
export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<PublicAccount> {
  const res = await apiPatch<PublicAccount>(`/accounts/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Update account failed');
  }
  return normaliseAccount(res.data);
}

/** `POST /accounts/:id/parent` — `account.manage` */
export async function setAccountParent(
  id: string,
  parentAccountId: string | null,
): Promise<PublicAccount> {
  const res = await apiPost<PublicAccount>(`/accounts/${id}/parent`, {
    parentAccountId,
  });
  if (!res.data) {
    throw new Error(res.message || 'Move account failed');
  }
  return normaliseAccount(res.data);
}

/** `POST /accounts/:id/activate` — `account.manage` */
export async function activateAccount(id: string): Promise<PublicAccount> {
  const res = await apiPost<PublicAccount>(`/accounts/${id}/activate`);
  if (!res.data) {
    throw new Error(res.message || 'Activate failed');
  }
  return normaliseAccount(res.data);
}

/** `POST /accounts/:id/deactivate` — `account.manage` */
export async function deactivateAccount(id: string): Promise<PublicAccount> {
  const res = await apiPost<PublicAccount>(`/accounts/${id}/deactivate`);
  if (!res.data) {
    throw new Error(res.message || 'Deactivate failed');
  }
  return normaliseAccount(res.data);
}

/** `DELETE /accounts/:id` — `account.manage` */
export async function deleteAccount(id: string): Promise<void> {
  await apiDelete(`/accounts/${id}`);
}

/** `POST /accounts/seed-standard` — `account.manage` */
export async function seedStandardAccounts(): Promise<SeedStandardResult> {
  const res = await apiPost<SeedStandardResult>('/accounts/seed-standard');
  if (!res.data) {
    throw new Error(res.message || 'Seed failed');
  }
  return res.data;
}
