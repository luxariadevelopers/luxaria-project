/**
 * Mirrors `apps/backend/src/modules/customers` public shapes.
 * List rows intentionally omit full Aadhaar (only last-4 reference).
 */

export const CustomerFundingType = {
  OwnFunds: 'own_funds',
  BankLoan: 'bank_loan',
  Mixed: 'mixed',
} as const;

export type CustomerFundingType =
  (typeof CustomerFundingType)[keyof typeof CustomerFundingType];

export const CustomerType = {
  Individual: 'individual',
  JointOwner: 'joint_owner',
  Company: 'company',
  Nri: 'nri',
  Trust: 'trust',
} as const;

export type CustomerType =
  (typeof CustomerType)[keyof typeof CustomerType];

export const CustomerStatus = {
  Draft: 'draft',
  PendingKyc: 'pending_kyc',
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type CustomerStatus =
  (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const CustomerKycStatus = {
  Pending: 'pending',
  Verified: 'verified',
  Rejected: 'rejected',
} as const;

export type CustomerKycStatus =
  (typeof CustomerKycStatus)[keyof typeof CustomerKycStatus];

/** Nest `CustomerDocumentCategory` */
export const CustomerDocumentCategory = {
  General: 'general',
  Pan: 'pan',
  Aadhaar: 'aadhaar',
  Photo: 'photo',
  AddressProof: 'address_proof',
  IncomeProof: 'income_proof',
  BankStatement: 'bank_statement',
  LoanSanction: 'loan_sanction',
  Kyc: 'kyc',
  Other: 'other',
} as const;

export type CustomerDocumentCategory =
  (typeof CustomerDocumentCategory)[keyof typeof CustomerDocumentCategory];

export type CustomerContact = {
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
};

export type CustomerAddress = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

export type CustomerJointApplicant = {
  fullName: string | null;
  relationship: string | null;
  pan: string | null;
  aadhaarReference: string | null;
  /** Decrypted when caller has `customer.manage`; otherwise null */
  aadhaar: string | null;
  phone: string | null;
  email: string | null;
};

/** Full API customer — may include decrypted Aadhaar for managers. */
export type PublicCustomer = {
  id: string;
  companyId: string | null;
  customerCode: string;
  fullName: string;
  customerType?: CustomerType;
  jointApplicant: CustomerJointApplicant;
  pan: string | null;
  aadhaarReference: string | null;
  /** Decrypted when caller has `customer.manage`; otherwise null */
  aadhaar: string | null;
  contact: CustomerContact;
  address: CustomerAddress;
  occupation: string | null;
  fundingType: CustomerFundingType;
  loanBank: string | null;
  kycStatus: CustomerKycStatus;
  kycVerifiedBy: string | null;
  kycVerifiedAt: string | null;
  kycNotes: string | null;
  status: CustomerStatus;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Safe list projection — no full Aadhaar / joint Aadhaar.
 * Acceptance: Aadhaar references shown masked; never full digits in lists.
 */
export type CustomerListRow = {
  id: string;
  customerCode: string;
  fullName: string;
  customerType?: CustomerType;
  pan: string | null;
  /** Last-4 only — display via aadhaarMasking helpers */
  aadhaarReference: string | null;
  email: string | null;
  phone: string | null;
  fundingType: CustomerFundingType;
  loanBank: string | null;
  kycStatus: CustomerKycStatus;
  status: CustomerStatus;
  kycNotes: string | null;
  hasJointApplicant: boolean;
};

export type ListCustomersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
  fundingType?: CustomerFundingType;
  kycStatus?: CustomerKycStatus;
  companyId?: string;
};

export type CreateCustomerInput = {
  fullName: string;
  pan?: string | null;
  aadhaar?: string | null;
  contact?: Partial<CustomerContact>;
  address?: Partial<CustomerAddress>;
  occupation?: string | null;
  fundingType: CustomerFundingType;
  loanBank?: string | null;
  status?: CustomerStatus;
  companyId?: string | null;
  jointApplicant?: {
    fullName?: string | null;
    relationship?: string | null;
    pan?: string | null;
    aadhaar?: string | null;
    phone?: string | null;
    email?: string | null;
  };
};

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'fundingType'>> & {
  fundingType?: CustomerFundingType;
};

export type VerifyKycInput = {
  verified: boolean;
  notes?: string | null;
};

/** Mirrors Nest `PublicCustomerDocument` */
export type PublicCustomerDocument = {
  id: string;
  customerId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  category: CustomerDocumentCategory | string;
  isSensitive: boolean;
  uploadedBy: string | null;
  createdAt?: string;
};

export type PaginatedCustomers = {
  items: CustomerListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/** Subset of Nest `PublicBooking` used on customer 360. */
export type CustomerBookingRow = {
  id: string;
  bookingNumber: string;
  customerId: string;
  projectId: string;
  unitId: string;
  bookingDate: string;
  bookingAmount: number;
  agreedPrice: number;
  status: string;
};

/** Subset of Nest `PublicCustomerReceipt` used on customer 360. */
export type CustomerReceiptRow = {
  id: string;
  receiptNumber: string;
  customerId: string;
  bookingId: string;
  projectId: string;
  receiptDate: string;
  amount: number;
  paymentMode: string;
  status: string;
  allocatedAmount: number;
  unallocatedAmount: number;
};

/** Row from `GET /accounting-reports/customer-ledger?partyId=` */
export type CustomerLedgerLine = {
  journalId: string;
  journalNumber: string;
  journalDate: string;
  accountCode: string;
  accountName: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
  partyName: string | null;
};

export type CustomerLedgerReport = {
  rows: CustomerLedgerLine[];
  totals: {
    debit: number;
    credit: number;
  };
};
