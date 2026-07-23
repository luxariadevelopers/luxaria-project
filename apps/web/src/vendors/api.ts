import { apiGet, apiPatch, apiPost } from '@/api/client';
import { toVendorListRow } from './listProjection';
import type {
  BlockVendorInput,
  CreateVendorInput,
  ListVendorsQuery,
  PaginatedVendors,
  PublicVendor,
  PublicVendorDocument,
  PublicVendorInvoiceRow,
  PublicVendorPaymentRow,
  PublicVendorProjectAssignment,
  PublicVendorQualityScore,
  UpdateVendorInput,
  VendorLedgerLine,
  VendorLedgerQuery,
  VendorLedgerReport,
  VerifyVendorInput,
} from './types';


function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseVendor(row: PublicVendor): PublicVendor {
  return {
    ...row,
    verifiedAt: toIso(row.verifiedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedVendors['meta'] {
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

/** `GET /vendors` — `vendor.view` */
export async function fetchVendors(
  query: ListVendorsQuery = {},
): Promise<PaginatedVendors> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicVendor[]>('/vendors', {
    ...query,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map((row) =>
      toVendorListRow(normaliseVendor(row)),
    ),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /vendors/:id` — `vendor.view` */
export async function fetchVendor(id: string): Promise<PublicVendor> {
  const res = await apiGet<PublicVendor>(`/vendors/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Vendor unavailable');
  }
  return normaliseVendor(res.data);
}

/** `POST /vendors` — `vendor.manage` */
export async function createVendor(
  input: CreateVendorInput,
): Promise<PublicVendor> {
  const res = await apiPost<PublicVendor>('/vendors', input);
  if (!res.data) {
    throw new Error(res.message || 'Vendor create failed');
  }
  return normaliseVendor(res.data);
}

/** `PATCH /vendors/:id` — `vendor.manage` */
export async function updateVendor(
  id: string,
  input: UpdateVendorInput,
): Promise<PublicVendor> {
  const res = await apiPatch<PublicVendor>(`/vendors/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Vendor update failed');
  }
  return normaliseVendor(res.data);
}

/** `POST /vendors/:id/verify` — `vendor.manage` */
export async function verifyVendor(
  id: string,
  input: VerifyVendorInput,
): Promise<PublicVendor> {
  const res = await apiPost<PublicVendor>(`/vendors/${id}/verify`, input);
  if (!res.data) {
    throw new Error(res.message || 'Vendor verification failed');
  }
  return normaliseVendor(res.data);
}

/** `POST /vendors/:id/activate` — `vendor.manage` */
export async function activateVendor(id: string): Promise<PublicVendor> {
  const res = await apiPost<PublicVendor>(`/vendors/${id}/activate`);
  if (!res.data) {
    throw new Error(res.message || 'Vendor activation failed');
  }
  return normaliseVendor(res.data);
}

/** `POST /vendors/:id/block` — `vendor.manage` */
export async function blockVendor(
  id: string,
  input: BlockVendorInput = {},
): Promise<PublicVendor> {
  const res = await apiPost<PublicVendor>(`/vendors/${id}/block`, input);
  if (!res.data) {
    throw new Error(res.message || 'Vendor block failed');
  }
  return normaliseVendor(res.data);
}

/** `GET /vendors/:id/documents` — `vendor.view` */
export async function fetchVendorDocuments(
  vendorId: string,
  query: { page?: number; limit?: number } = {},
): Promise<PublicVendorDocument[]> {
  const res = await apiGet<PublicVendorDocument[]>(
    `/vendors/${vendorId}/documents`,
    {
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    },
  );
  return (res.data ?? []).map((row) => ({
    ...row,
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
  }));
}

/** `GET /vendors/:id/projects` — `vendor.view` */
export async function fetchVendorProjects(
  vendorId: string,
  query: { page?: number; limit?: number } = {},
): Promise<PublicVendorProjectAssignment[]> {
  const res = await apiGet<PublicVendorProjectAssignment[]>(
    `/vendors/${vendorId}/projects`,
    {
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    },
  );
  return (res.data ?? []).map((row) => ({
    ...row,
    assignedAt: toIso(row.assignedAt) ?? String(row.assignedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  }));
}

/** `GET /vendors/:id/ledger` — `vendor.view` (journal-backed party ledger). */
export async function fetchVendorLedger(
  vendorId: string,
  query: VendorLedgerQuery = {},
): Promise<VendorLedgerReport> {
  const res = await apiGet<{
    vendorId: string;
    vendorCode: string;
    legalName: string;
    currency?: string;
    openingBalance?: number;
    totalDebit?: number;
    totalCredit?: number;
    closingBalance?: number;
    rows?: VendorLedgerLine[];
    filters?: VendorLedgerReport['filters'];
    reconciled?: boolean;
    reconciliationNotes?: string[];
    asOf?: string;
  }>(`/vendors/${vendorId}/ledger`, {
    financialYearId: query.financialYearId || undefined,
    projectId: query.projectId || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
  });
  if (!res.data) {
    throw new Error(res.message || 'Vendor ledger unavailable');
  }
  const rows = (res.data.rows ?? []).map((row) => ({
    journalId: row.journalId,
    journalNumber: row.journalNumber,
    journalDate: row.journalDate,
    accountCode: row.accountCode,
    accountName: row.accountName,
    narration: row.narration,
    description: row.description ?? null,
    debit: Number(row.debit ?? 0),
    credit: Number(row.credit ?? 0),
    runningBalance: Number(row.runningBalance ?? 0),
    projectId: row.projectId ?? null,
    partyName: row.partyName ?? null,
    sourceModule: row.sourceModule ?? null,
    sourceEntityType: row.sourceEntityType ?? null,
    sourceEntityId: row.sourceEntityId ?? null,
  }));
  return {
    vendorId: res.data.vendorId,
    vendorCode: res.data.vendorCode,
    legalName: res.data.legalName,
    currency: res.data.currency ?? 'INR',
    openingBalance: Number(res.data.openingBalance ?? 0),
    totalDebit: Number(res.data.totalDebit ?? 0),
    totalCredit: Number(res.data.totalCredit ?? 0),
    closingBalance: Number(res.data.closingBalance ?? 0),
    rows,
    filters: res.data.filters ?? null,
    reconciled: res.data.reconciled ?? true,
    reconciliationNotes: res.data.reconciliationNotes ?? [],
    asOf: res.data.asOf ?? new Date().toISOString(),
  };
}

/** `GET /vendor-invoices?vendorId=` — `vendor_invoice.view` */
export async function fetchVendorInvoices(
  vendorId: string,
  query: { page?: number; limit?: number } = {},
): Promise<PublicVendorInvoiceRow[]> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<PublicVendorInvoiceRow[]>('/vendor-invoices', {
    vendorId,
    page,
    limit,
  });
  return (res.data ?? []).map((row) => ({
    ...row,
    invoiceDate: toIso(row.invoiceDate) ?? String(row.invoiceDate),
    dueDate: toIso(row.dueDate) ?? String(row.dueDate),
    paidAmount: Number(row.paidAmount ?? 0),
    remainingPayable: Number(row.remainingPayable ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
  }));
}

/** `GET /vendor-payments?vendorId=` — `payment.view` */
export async function fetchVendorPayments(
  vendorId: string,
  query: { page?: number; limit?: number } = {},
): Promise<PublicVendorPaymentRow[]> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<PublicVendorPaymentRow[]>('/vendor-payments', {
    vendorId,
    page,
    limit,
  });
  return (res.data ?? []).map((row) => ({
    ...row,
    paymentDate: toIso(row.paymentDate) ?? String(row.paymentDate),
    amount: Number(row.amount ?? 0),
    bankAmount: Number(row.bankAmount ?? 0),
  }));
}

/** `GET /vendors/:vendorId/quality-score` — `quality.view` */
export async function fetchVendorQualityScore(
  vendorId: string,
): Promise<PublicVendorQualityScore> {
  const res = await apiGet<PublicVendorQualityScore>(
    `/vendors/${vendorId}/quality-score`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor quality score unavailable');
  }
  return {
    ...res.data,
    lastInspectionAt: toIso(res.data.lastInspectionAt),
  };
}
