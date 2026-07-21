/** Mirrors Nest `apps/backend/src/modules/customer-invoices`. */

export const CustomerInvoiceStatus = {
  Draft: 'draft',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type CustomerInvoiceStatus =
  (typeof CustomerInvoiceStatus)[keyof typeof CustomerInvoiceStatus];

export type PublicCustomerInvoice = {
  id: string;
  invoiceNumber: string;
  companyId: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  status: CustomerInvoiceStatus;
  taxableAmount: number;
  totalAmount: number;
  createdAt?: string;
};

export type CustomerInvoiceListRow = Pick<
  PublicCustomerInvoice,
  | 'id'
  | 'invoiceNumber'
  | 'invoiceDate'
  | 'dueDate'
  | 'status'
  | 'taxableAmount'
  | 'totalAmount'
  | 'customerId'
  | 'bookingId'
>;

export type ListCustomerInvoicesQuery = {
  page?: number;
  limit?: number;
  companyId?: string;
  projectId?: string;
  bookingId?: string;
  customerId?: string;
  status?: CustomerInvoiceStatus;
};

export type PaginatedCustomerInvoices = {
  items: CustomerInvoiceListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
