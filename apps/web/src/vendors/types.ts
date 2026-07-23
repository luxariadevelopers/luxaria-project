/**
 * Mirrors `apps/backend/src/modules/vendors` public shapes.
 * List rows intentionally omit bank details (full account never shown in table).
 */

export const VendorStatus = {
  Draft: 'draft',
  PendingVerification: 'pending_verification',
  Active: 'active',
  Blocked: 'blocked',
  Inactive: 'inactive',
} as const;

export type VendorStatus = (typeof VendorStatus)[keyof typeof VendorStatus];

export const VendorVerificationStatus = {
  Pending: 'pending',
  Verified: 'verified',
  Rejected: 'rejected',
} as const;

export type VendorVerificationStatus =
  (typeof VendorVerificationStatus)[keyof typeof VendorVerificationStatus];

export type VendorContact = {
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  contactPerson: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

export type VendorBillingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

/** Full API vendor — bank may be present; never bind bank into list UI. */
export type PublicVendor = {
  id: string;
  companyId: string | null;
  vendorCode: string;
  legalName: string;
  tradeName: string | null;
  gstin: string | null;
  pan: string | null;
  contact: VendorContact;
  billingAddress: VendorBillingAddress;
  bankDetails?: {
    bankName: string | null;
    branchName: string | null;
    ifsc: string | null;
    accountHolderName: string | null;
    accountNumber: string | null;
    accountNumberLast4: string | null;
  };
  materialCategories: string[];
  paymentTerms: string | null;
  creditLimit: number;
  tdsApplicable: boolean;
  tdsPercentage: number | null;
  retentionPercentage: number;
  rating: number | null;
  verificationStatus: VendorVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
  status: VendorStatus;
  blockReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Safe list projection — no bank / encrypted fields.
 * Acceptance: full bank account data must not appear in list screens.
 */
export type VendorListRow = {
  id: string;
  vendorCode: string;
  legalName: string;
  tradeName: string | null;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  materialCategories: string[];
  paymentTerms: string | null;
  rating: number | null;
  verificationStatus: VendorVerificationStatus;
  status: VendorStatus;
  blockReason: string | null;
};

export type ListVendorsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: VendorStatus;
  verificationStatus?: VendorVerificationStatus;
  materialCategory?: string;
  companyId?: string;
  projectId?: string;
};

export type CreateVendorInput = {
  legalName: string;
  tradeName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  contact?: Partial<VendorContact>;
  billingAddress?: Partial<VendorBillingAddress>;
  bankDetails?: {
    bankName?: string | null;
    branchName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumber?: string | null;
  };
  materialCategories?: string[];
  paymentTerms?: string | null;
  creditLimit?: number;
  tdsApplicable?: boolean;
  tdsPercentage?: number | null;
  retentionPercentage?: number;
  rating?: number | null;
  companyId?: string | null;
};

export type UpdateVendorInput = Partial<CreateVendorInput>;

export type BlockVendorInput = {
  reason?: string | null;
};

export type VerifyVendorInput = {
  verified: boolean;
  notes?: string | null;
};

export type PaginatedVendors = {
  items: VendorListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

// --- Phase 057 360 types ---

export const VendorDocumentCategory = {
  General: 'general',
  Agreement: 'agreement',
  Pan: 'pan',
  Gst: 'gst',
  BankProof: 'bank_proof',
  Msme: 'msme',
  CancelledCheque: 'cancelled_cheque',
  Other: 'other',
} as const;

export type VendorDocumentCategory =
  (typeof VendorDocumentCategory)[keyof typeof VendorDocumentCategory];

export const VendorProjectAssignmentStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type VendorProjectAssignmentStatus =
  (typeof VendorProjectAssignmentStatus)[keyof typeof VendorProjectAssignmentStatus];

export const VendorInvoiceStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Verification: 'verification',
  Matching: 'matching',
  Approval: 'approval',
  Posted: 'posted',
  Paid: 'paid',
  Cancelled: 'cancelled',
} as const;

export type VendorInvoiceStatus =
  (typeof VendorInvoiceStatus)[keyof typeof VendorInvoiceStatus];

export const VendorPaymentStatus = {
  Draft: 'draft',
  Approval: 'approval',
  Released: 'released',
  Verified: 'verified',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type VendorPaymentStatus =
  (typeof VendorPaymentStatus)[keyof typeof VendorPaymentStatus];

export type PublicVendorContact = {
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  contactPerson: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

export type PublicVendorBillingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

export type PublicVendorBankDetails = {
  bankName: string | null;
  branchName: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  accountNumberLast4: string | null;
};

export type PublicVendorDocument = {
  id: string;
  vendorId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  category: VendorDocumentCategory;
  uploadedBy: string | null;
  createdAt?: string;
};

export type PublicVendorProjectAssignment = {
  id: string;
  vendorId: string;
  projectId: string;
  status: VendorProjectAssignmentStatus;
  notes: string | null;
  assignedBy: string | null;
  assignedAt: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Optional filters for `GET /vendors/:id/ledger`. */
export type VendorLedgerQuery = {
  financialYearId?: string;
  projectId?: string;
  from?: string;
  to?: string;
};

/** Journal line from Nest `GET /vendors/:id/ledger` (accounting-reports vendor-ledger). */
export type VendorLedgerLine = {
  journalId: string;
  journalNumber: string;
  journalDate: string;
  accountCode: string;
  accountName: string;
  narration: string;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  projectId: string | null;
  partyName: string | null;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
};

/** Nest `GET /vendors/:id/ledger` — journal-backed vendor party ledger. */
export type VendorLedgerReport = {
  vendorId: string;
  vendorCode: string;
  legalName: string;
  currency: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  rows: VendorLedgerLine[];
  filters: {
    financialYearId: string | null;
    financialYearName: string | null;
    projectId: string | null;
    projectCode: string | null;
    projectName: string | null;
    from: string | null;
    to: string | null;
    accountId: string | null;
    partyId: string | null;
  } | null;
  reconciled: boolean;
  reconciliationNotes: string[];
  asOf: string;
};

/** @deprecated Use VendorLedgerReport */
export type VendorLedgerPlaceholder = VendorLedgerReport;

export type PublicVendorInvoiceRow = {
  id: string;
  documentNumber: string;
  invoiceNumber: string;
  vendorId: string;
  projectId: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingPayable: number;
  status: VendorInvoiceStatus;
};

export type PublicVendorPaymentRow = {
  id: string;
  paymentNumber: string;
  vendorId: string;
  projectId: string;
  paymentDate: string;
  amount: number;
  bankAmount: number;
  paymentMode: string;
  status: VendorPaymentStatus;
  transactionReference: string;
};

/** Nest `GET /vendors/:vendorId/quality-score` (`quality.view`). */

export type PublicVendorQualityScore = {
  id: string;
  vendorId: string;
  inspectionsCount: number;
  acceptedCount: number;
  partiallyAcceptedCount: number;
  rejectedCount: number;
  holdCount: number;
  score: number;
  ratingEquivalent: number;
  lastInspectionAt: string | null;
  lastInspectionId: string | null;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;
