import { ContractorBillStatus } from '@luxaria/shared-types';
import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  BankAccountOption,
  CreateContractorPaymentInput,
  ListContractorPaymentsQuery,
  PaginatedContractorPayments,
  PayableBillOption,
  PublicContractorPayment,
  UpdateContractorPaymentInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toDateOnly(value: unknown): string {
  const iso = toIso(value);
  if (!iso) return '';
  return iso.slice(0, 10);
}

function normalisePayment(
  row: PublicContractorPayment,
): PublicContractorPayment {
  return {
    ...row,
    paymentDate: toDateOnly(row.paymentDate) || row.paymentDate,
    submittedAt: toIso(row.submittedAt),
    approvedAt: toIso(row.approvedAt),
    releasedAt: toIso(row.releasedAt),
    verifiedAt: toIso(row.verifiedAt),
    postedAt: toIso(row.postedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    allocations: (row.allocations ?? []).map((a) => ({ ...a })),
    billIds: row.billIds ?? [],
    tds: Number(row.tds ?? 0),
    retention: Number(row.retention ?? 0),
    advanceRecovery: Number(row.advanceRecovery ?? 0),
    penalty: Number(row.penalty ?? 0),
    bankAmount: Number(row.bankAmount ?? 0),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedContractorPayments['meta'] {
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

/** `GET /contractor-payments` — Nest `payment.view` */
export async function fetchContractorPayments(
  query: ListContractorPaymentsQuery = {},
): Promise<PaginatedContractorPayments> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicContractorPayment[]>(
    '/contractor-payments',
    {
      page,
      limit,
      search: query.search,
      projectId: query.projectId,
      contractorId: query.contractorId,
      status: query.status,
      billId: query.billId,
    },
  );
  return {
    items: (res.data ?? []).map(normalisePayment),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /contractor-payments/:id` — Nest `payment.view` */
export async function fetchContractorPayment(
  id: string,
): Promise<PublicContractorPayment> {
  const res = await apiGet<PublicContractorPayment>(
    `/contractor-payments/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor payment unavailable');
  }
  return normalisePayment(res.data);
}

/** `POST /contractor-payments` — Nest `payment.release` */
export async function createContractorPayment(
  input: CreateContractorPaymentInput,
): Promise<PublicContractorPayment> {
  const res = await apiPost<PublicContractorPayment>(
    '/contractor-payments',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor payment create failed');
  }
  return normalisePayment(res.data);
}

/** `PATCH /contractor-payments/:id` — Nest `payment.release` */
export async function updateContractorPayment(
  id: string,
  input: UpdateContractorPaymentInput,
): Promise<PublicContractorPayment> {
  const res = await apiPatch<PublicContractorPayment>(
    `/contractor-payments/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor payment update failed');
  }
  return normalisePayment(res.data);
}

/** `POST /contractor-payments/:id/submit` — Nest `payment.release` */
export async function submitContractorPayment(
  id: string,
): Promise<PublicContractorPayment> {
  const res = await apiPost<PublicContractorPayment>(
    `/contractor-payments/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor payment submit failed');
  }
  return normalisePayment(res.data);
}

/** `POST /contractor-payments/:id/approve` — Nest `payment.approve` */
export async function approveContractorPayment(
  id: string,
): Promise<PublicContractorPayment> {
  const res = await apiPost<PublicContractorPayment>(
    `/contractor-payments/${encodeURIComponent(id)}/approve`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor payment approve failed');
  }
  return normalisePayment(res.data);
}

/** `POST /contractor-payments/:id/release` — Nest `payment.release` */
export async function releaseContractorPayment(
  id: string,
): Promise<PublicContractorPayment> {
  const res = await apiPost<PublicContractorPayment>(
    `/contractor-payments/${encodeURIComponent(id)}/release`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor payment release failed');
  }
  return normalisePayment(res.data);
}

/** `POST /contractor-payments/:id/verify` — Nest `payment.approve` */
export async function verifyContractorPayment(
  id: string,
): Promise<PublicContractorPayment> {
  const res = await apiPost<PublicContractorPayment>(
    `/contractor-payments/${encodeURIComponent(id)}/verify`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor payment verify failed');
  }
  return normalisePayment(res.data);
}

/** `POST /contractor-payments/:id/post` — Nest `payment.approve` */
export async function postContractorPayment(
  id: string,
): Promise<PublicContractorPayment> {
  const res = await apiPost<PublicContractorPayment>(
    `/contractor-payments/${encodeURIComponent(id)}/post`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor payment post failed');
  }
  return normalisePayment(res.data);
}

/** `POST /contractor-payments/:id/cancel` — Nest `payment.release` */
export async function cancelContractorPayment(
  id: string,
): Promise<PublicContractorPayment> {
  const res = await apiPost<PublicContractorPayment>(
    `/contractor-payments/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor payment cancel failed');
  }
  return normalisePayment(res.data);
}

/**
 * Posted running bills for payment allocation.
 * Nest payment requires posted (or paid with remaining) bills.
 * Uses `GET /contractor-bills` (`running_bill.view`).
 */
export async function fetchPayableBills(input: {
  projectId: string;
  contractorId: string;
}): Promise<PayableBillOption[]> {
  const res = await apiGet<PayableBillOption[]>('/contractor-bills', {
    page: 1,
    limit: 100,
    projectId: input.projectId,
    contractorId: input.contractorId,
    status: ContractorBillStatus.Posted,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    billNumber: row.billNumber,
    raNumber: Number(row.raNumber ?? 0),
    contractorId: row.contractorId,
    netPayable: Number(row.netPayable ?? 0),
    paidAmount: Number(row.paidAmount ?? 0),
    remainingPayable: Number(row.remainingPayable ?? 0),
    status: row.status,
    retention: Number(row.retention ?? 0),
    advanceRecovery: Number(row.advanceRecovery ?? 0),
    tds: Number(row.tds ?? 0),
  }));
}

/** `GET /company-bank-accounts` — Nest `bank.view` */
export async function fetchBankAccountOptions(
  projectId?: string,
): Promise<BankAccountOption[]> {
  const res = await apiGet<
    Array<{
      id: string;
      accountName?: string;
      bankName?: string;
      accountNumberMasked?: string;
      status?: string;
    }>
  >('/company-bank-accounts', {
    page: 1,
    limit: 100,
    status: 'active',
    projectId: projectId || undefined,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    label: [row.accountName, row.bankName, row.accountNumberMasked]
      .filter(Boolean)
      .join(' · '),
  }));
}

export type ContractorOption = {
  id: string;
  contractorCode: string;
  legalName: string;
};

/** `GET /contractors` — Nest `contractor.view` */
export async function searchContractorOptions(
  search = '',
  limit = 50,
): Promise<ContractorOption[]> {
  const res = await apiGet<ContractorOption[]>('/contractors', {
    page: 1,
    limit,
    search: search.trim() || undefined,
  });
  return res.data ?? [];
}
