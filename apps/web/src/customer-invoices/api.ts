import { apiGet } from '@/api/client';
import type {
  CustomerInvoiceListRow,
  ListCustomerInvoicesQuery,
  PaginatedCustomerInvoices,
  PublicCustomerInvoice,
} from './types';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return toIso(value) ?? null;
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedCustomerInvoices['meta'] {
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

function toListRow(row: PublicCustomerInvoice): CustomerInvoiceListRow {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    status: row.status,
    taxableAmount: row.taxableAmount,
    totalAmount: row.totalAmount,
    customerId: row.customerId,
    bookingId: row.bookingId,
  };
}

function normalise(row: PublicCustomerInvoice): PublicCustomerInvoice {
  return {
    ...row,
    invoiceDate: toIso(row.invoiceDate) ?? '',
    dueDate: toIsoOrNull(row.dueDate),
    createdAt: toIso(row.createdAt),
  };
}

/** `GET /customer-invoices` — `customer_invoice.view` */
export async function fetchCustomerInvoices(
  query: ListCustomerInvoicesQuery = {},
): Promise<PaginatedCustomerInvoices> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicCustomerInvoice[]>('/customer-invoices', {
    page,
    limit,
    companyId: query.companyId || undefined,
    projectId: query.projectId || undefined,
    bookingId: query.bookingId || undefined,
    customerId: query.customerId || undefined,
    status: query.status || undefined,
  });
  return {
    items: (res.data ?? []).map((row) => toListRow(normalise(row))),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}
