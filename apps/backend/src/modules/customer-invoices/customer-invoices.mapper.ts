import type { Types } from 'mongoose';
import type {
  CustomerInvoiceLine,
  CustomerInvoiceStatus,
} from './schemas/customer-invoice.schema';

export type PublicCustomerInvoiceLine = {
  id: string | null;
  description: string;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export type PublicCustomerInvoice = {
  id: string;
  invoiceNumber: string;
  companyId: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string | null;
  invoiceDate: Date;
  dueDate: Date | null;
  status: CustomerInvoiceStatus;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  placeOfSupply: string | null;
  hsnSac: string | null;
  lines: PublicCustomerInvoiceLine[];
  journalEntryId: string | null;
  gstDocumentId: string | null;
  demandId: string | null;
  paymentScheduleId: string | null;
  notes: string | null;
  createdBy: string | null;
  postedBy: string | null;
  postedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

function mapLine(
  line: CustomerInvoiceLine & { _id?: Types.ObjectId },
): PublicCustomerInvoiceLine {
  return {
    id: line._id ? String(line._id) : null,
    description: line.description,
    taxableAmount: line.taxableAmount,
    taxAmount: line.taxAmount ?? 0,
    totalAmount: line.totalAmount,
  };
}

export function toPublicCustomerInvoice(row: {
  _id: Types.ObjectId | string;
  invoiceNumber: string;
  companyId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  bookingId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  unitId?: Types.ObjectId | string | null;
  invoiceDate: Date;
  dueDate?: Date | null;
  status: CustomerInvoiceStatus;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  placeOfSupply?: string | null;
  hsnSac?: string | null;
  lines?: CustomerInvoiceLine[];
  journalEntryId?: Types.ObjectId | string | null;
  gstDocumentId?: Types.ObjectId | string | null;
  demandId?: Types.ObjectId | string | null;
  paymentScheduleId?: Types.ObjectId | string | null;
  notes?: string | null;
  createdBy?: Types.ObjectId | string | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicCustomerInvoice {
  return {
    id: String(row._id),
    invoiceNumber: row.invoiceNumber,
    companyId: String(row.companyId),
    projectId: String(row.projectId),
    bookingId: String(row.bookingId),
    customerId: String(row.customerId),
    unitId: oid(row.unitId),
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate ?? null,
    status: row.status,
    taxableAmount: row.taxableAmount,
    cgst: row.cgst ?? 0,
    sgst: row.sgst ?? 0,
    igst: row.igst ?? 0,
    totalAmount: row.totalAmount,
    placeOfSupply: row.placeOfSupply ?? null,
    hsnSac: row.hsnSac ?? null,
    lines: (row.lines ?? []).map(mapLine),
    journalEntryId: oid(row.journalEntryId),
    gstDocumentId: oid(row.gstDocumentId),
    demandId: oid(row.demandId),
    paymentScheduleId: oid(row.paymentScheduleId),
    notes: row.notes ?? null,
    createdBy: oid(row.createdBy),
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
