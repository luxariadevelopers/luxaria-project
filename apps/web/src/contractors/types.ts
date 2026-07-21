/**
 * Mirrors Nest `contractors` public shapes (`contractors.mapper.ts`).
 * List rows omit bank details.
 */

export const ContractorStatus = {
  Draft: 'draft',
  PendingVerification: 'pending_verification',
  Active: 'active',
  Blocked: 'blocked',
  Inactive: 'inactive',
} as const;

export type ContractorStatus =
  (typeof ContractorStatus)[keyof typeof ContractorStatus];

export const ContractorVerificationStatus = {
  Pending: 'pending',
  Verified: 'verified',
  Rejected: 'rejected',
} as const;

export type ContractorVerificationStatus =
  (typeof ContractorVerificationStatus)[keyof typeof ContractorVerificationStatus];

export const ContractorType = {
  Labour: 'labour',
  Civil: 'civil',
  Electrical: 'electrical',
  Plumbing: 'plumbing',
  Finishing: 'finishing',
  Specialist: 'specialist',
  General: 'general',
  Other: 'other',
} as const;

export type ContractorType =
  (typeof ContractorType)[keyof typeof ContractorType];

export type ContractorContact = {
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

export type PublicContractor = {
  id: string;
  companyId: string | null;
  contractorCode: string;
  legalName: string;
  tradeName: string | null;
  contractorType: ContractorType;
  pan: string | null;
  gstin: string | null;
  contact: ContractorContact;
  bankDetails?: {
    bankName: string | null;
    branchName: string | null;
    ifsc: string | null;
    accountHolderName: string | null;
    accountNumber: string | null;
    accountNumberLast4: string | null;
  };
  labourLicence?: {
    licenceNumber: string | null;
    issuedBy: string | null;
    validFrom: string | null;
    validTo: string | null;
    notes: string | null;
  };
  workCategories: string[];
  rating: number | null;
  verificationStatus: ContractorVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
  status: ContractorStatus;
  blockReason: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ContractorListRow = {
  id: string;
  contractorCode: string;
  legalName: string;
  tradeName: string | null;
  contractorType: ContractorType;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  workCategories: string[];
  rating: number | null;
  verificationStatus: ContractorVerificationStatus;
  status: ContractorStatus;
  blockReason: string | null;
};

export type ListContractorsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ContractorStatus;
  verificationStatus?: ContractorVerificationStatus;
  contractorType?: ContractorType;
  workCategory?: string;
  companyId?: string;
  projectId?: string;
};

export type CreateContractorInput = {
  legalName: string;
  tradeName?: string | null;
  contractorType: ContractorType;
  pan?: string | null;
  gstin?: string | null;
  contact?: Partial<ContractorContact>;
  bankDetails?: {
    bankName?: string | null;
    branchName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumber?: string | null;
  };
  workCategories?: string[];
  rating?: number | null;
  notes?: string | null;
};

export type UpdateContractorInput = Partial<CreateContractorInput>;

export type BlockContractorInput = {
  reason?: string | null;
};

export type VerifyContractorInput = {
  verified: boolean;
  notes?: string | null;
};

export type PaginatedContractors = {
  items: ContractorListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
