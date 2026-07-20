/**
 * Mirrors `apps/backend/src/modules/investors` public shapes.
 * List rows intentionally omit bank details.
 */

export const InvestorType = {
  Individual: 'individual',
  Company: 'company',
  Partnership: 'partnership',
  Trust: 'trust',
  DirectorAsProjectInvestor: 'director_as_project_investor',
} as const;

export type InvestorType = (typeof InvestorType)[keyof typeof InvestorType];

export const InvestorStatus = {
  Draft: 'draft',
  PendingKyc: 'pending_kyc',
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type InvestorStatus =
  (typeof InvestorStatus)[keyof typeof InvestorStatus];

export const InvestorKycStatus = {
  Pending: 'pending',
  Verified: 'verified',
  Rejected: 'rejected',
} as const;

export type InvestorKycStatus =
  (typeof InvestorKycStatus)[keyof typeof InvestorKycStatus];

/** Nest `InvestorDocumentCategory` */
export const InvestorDocumentCategory = {
  General: 'general',
  Pan: 'pan',
  Aadhaar: 'aadhaar',
  Gst: 'gst',
  Cin: 'cin',
  BankProof: 'bank_proof',
  Kyc: 'kyc',
  Nominee: 'nominee',
  Other: 'other',
} as const;

export type InvestorDocumentCategory =
  (typeof InvestorDocumentCategory)[keyof typeof InvestorDocumentCategory];

export type InvestorContact = {
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

/** Full API investor — bank may be present; never bind bank into list UI. */
export type PublicInvestor = {
  id: string;
  companyId: string | null;
  investorCode: string;
  investorType: InvestorType;
  legalName: string;
  pan: string | null;
  gstin: string | null;
  cin: string | null;
  userId: string | null;
  directorId: string | null;
  contact: InvestorContact;
  bankDetails?: {
    bankName: string | null;
    branchName: string | null;
    ifsc: string | null;
    accountHolderName: string | null;
    accountNumber: string | null;
    accountNumberLast4: string | null;
  };
  nominee?: {
    fullName: string | null;
    relationship: string | null;
    pan: string | null;
    phone: string | null;
    email: string | null;
    sharePercent: number | null;
  };
  kycStatus: InvestorKycStatus;
  kycVerifiedBy: string | null;
  kycVerifiedAt: string | null;
  kycNotes: string | null;
  status: InvestorStatus;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Safe list projection — no bank / nominee / encrypted fields.
 * Acceptance: bank data must not appear in list screens.
 */
export type InvestorListRow = {
  id: string;
  investorCode: string;
  investorType: InvestorType;
  legalName: string;
  pan: string | null;
  gstin: string | null;
  cin: string | null;
  directorId: string | null;
  email: string | null;
  phone: string | null;
  kycStatus: InvestorKycStatus;
  status: InvestorStatus;
  kycNotes: string | null;
};

export type ListInvestorsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvestorStatus;
  investorType?: InvestorType;
  kycStatus?: InvestorKycStatus;
  companyId?: string;
};

export type CreateInvestorInput = {
  investorType: InvestorType;
  legalName: string;
  pan?: string | null;
  gstin?: string | null;
  cin?: string | null;
  userId?: string | null;
  directorId?: string | null;
  contact?: Partial<InvestorContact>;
  bankDetails?: {
    bankName?: string | null;
    branchName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumber?: string | null;
  };
  status?: InvestorStatus;
  companyId?: string | null;
};

export type UpdateInvestorInput = Partial<
  Omit<CreateInvestorInput, 'investorType'>
> & {
  investorType?: InvestorType;
};

export type VerifyKycInput = {
  verified: boolean;
  notes?: string | null;
};

/** Mirrors Nest `PublicInvestorDocument` */
export type PublicInvestorDocument = {
  id: string;
  investorId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  category: InvestorDocumentCategory | string;
  uploadedBy: string | null;
  createdAt?: string;
};

export type PaginatedInvestors = {
  items: InvestorListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
