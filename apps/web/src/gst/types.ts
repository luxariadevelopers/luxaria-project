/** Mirrors Nest `apps/backend/src/modules/gst`. */

export const GstDocumentType = {
  TaxInvoice: 'tax_invoice',
  DebitNote: 'debit_note',
  CreditNote: 'credit_note',
  BillOfSupply: 'bill_of_supply',
  SelfInvoice: 'self_invoice',
} as const;

export type GstDocumentType =
  (typeof GstDocumentType)[keyof typeof GstDocumentType];

export const GstDirection = {
  Inward: 'inward',
  Outward: 'outward',
} as const;

export type GstDirection = (typeof GstDirection)[keyof typeof GstDirection];

export const GstDocumentStatus = {
  Draft: 'draft',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type GstDocumentStatus =
  (typeof GstDocumentStatus)[keyof typeof GstDocumentStatus];

export const GstReturnType = {
  Gstr1: 'gstr1',
  Gstr3b: 'gstr3b',
  Gstr2b: 'gstr2b',
} as const;

export type GstReturnType = (typeof GstReturnType)[keyof typeof GstReturnType];

export const GstReturnStatus = {
  Draft: 'draft',
  Computed: 'computed',
  Filed: 'filed',
  Cancelled: 'cancelled',
} as const;

export type GstReturnStatus =
  (typeof GstReturnStatus)[keyof typeof GstReturnStatus];

export type PublicGstDocument = {
  id: string;
  documentNumber: string;
  companyId: string;
  projectId: string | null;
  documentType: GstDocumentType;
  direction: GstDirection;
  partyName: string;
  partyGstin: string | null;
  documentDate: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalValue: number;
  status: GstDocumentStatus;
  createdAt?: string;
};

export type GstDocumentListRow = Pick<
  PublicGstDocument,
  | 'id'
  | 'documentNumber'
  | 'documentType'
  | 'direction'
  | 'partyName'
  | 'documentDate'
  | 'taxableValue'
  | 'totalValue'
  | 'status'
  | 'projectId'
>;

export type PublicGstReturn = {
  id: string;
  returnNumber: string;
  companyId: string;
  returnType: GstReturnType;
  periodMonth: number;
  periodYear: number;
  status: GstReturnStatus;
  taxPayable: number;
  itcAvailable: number;
  filedAt: string | null;
  acknowledgementNumber: string | null;
  createdAt?: string;
};

export type GstReturnListRow = Pick<
  PublicGstReturn,
  | 'id'
  | 'returnNumber'
  | 'returnType'
  | 'periodMonth'
  | 'periodYear'
  | 'status'
  | 'taxPayable'
  | 'itcAvailable'
  | 'filedAt'
>;

export type ListGstDocumentsQuery = {
  page?: number;
  limit?: number;
  companyId?: string;
  projectId?: string;
  direction?: GstDirection;
  status?: GstDocumentStatus;
  documentType?: GstDocumentType;
  from?: string;
  to?: string;
};

export type ListGstReturnsQuery = {
  page?: number;
  limit?: number;
  companyId?: string;
  returnType?: GstReturnType;
  periodMonth?: number;
  periodYear?: number;
};

export type PaginatedGstDocuments = {
  items: GstDocumentListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type PaginatedGstReturns = {
  items: GstReturnListRow[];
  meta: PaginatedGstDocuments['meta'];
};
