/**
 * Mirrors `apps/backend/src/modules/directors` public mapper shapes.
 */

export const DirectorStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Resigned: 'resigned',
} as const;

export type DirectorStatus =
  (typeof DirectorStatus)[keyof typeof DirectorStatus];

export const DirectorDocumentCategory = {
  General: 'general',
  Din: 'din',
  Pan: 'pan',
  Appointment: 'appointment',
  Kyc: 'kyc',
  Other: 'other',
} as const;

export type DirectorDocumentCategory =
  (typeof DirectorDocumentCategory)[keyof typeof DirectorDocumentCategory];

export type PublicDirector = {
  id: string;
  companyId: string | null;
  directorCode: string;
  userId: string | null;
  fullName: string;
  din: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  appointmentDate: string | null;
  status: DirectorStatus;
  isPlaceholder: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicDirectorDocument = {
  id: string;
  directorId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  category: DirectorDocumentCategory;
  uploadedBy: string | null;
  createdAt?: string;
};

export type PublicShareholding = {
  id: string;
  companyId: string;
  directorId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  numberOfShares: number;
  faceValue: number;
  percentage: number;
  approvalReference: string | null;
  documentId: string | null;
  version: number;
  changeRequestId: string | null;
  createdAt?: string;
};

export type ActiveShareholdingSummary = {
  holdings: PublicShareholding[];
  totalPercentage: number;
  isBalanced: boolean;
  note: string;
};

/** Nest `ShareholdingChangeStatus` */
export const ShareholdingChangeStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type ShareholdingChangeStatus =
  (typeof ShareholdingChangeStatus)[keyof typeof ShareholdingChangeStatus];

export type ProposedShareholdingLine = {
  directorId: string;
  numberOfShares: number;
  faceValue: number;
  percentage: number;
  documentId: string | null;
};

/** Mirrors `PublicShareholdingChangeRequest` from directors.mapper.ts */
export type PublicShareholdingChangeRequest = {
  id: string;
  companyId: string;
  reason: string;
  approvalReference: string | null;
  proposedHoldings: ProposedShareholdingLine[];
  status: ShareholdingChangeStatus | string;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalNote: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  appliedVersion: number | null;
  createdAt?: string;
};

export type ProposeShareholdingInput = {
  reason: string;
  approvalReference?: string | null;
  proposedHoldings: Array<{
    directorId: string;
    numberOfShares: number;
    faceValue: number;
    percentage: number;
    documentId?: string | null;
  }>;
  companyId?: string | null;
};

export type ListShareholdingHistoryQuery = {
  page?: number;
  limit?: number;
  companyId?: string | null;
  directorId?: string;
};

export type ListShareholdingChangeRequestsQuery = {
  page?: number;
  limit?: number;
  companyId?: string | null;
  status?: ShareholdingChangeStatus | string;
};

export type ListDirectorsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: DirectorStatus;
  companyId?: string;
  sortOrder?: 'asc' | 'desc';
};

export type CreateDirectorInput = {
  fullName: string;
  userId?: string | null;
  din?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  appointmentDate?: string | null;
  status?: DirectorStatus;
  companyId?: string | null;
};

export type UpdateDirectorInput = {
  fullName?: string;
  userId?: string | null;
  din?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  appointmentDate?: string | null;
  status?: DirectorStatus;
};

export type PaginatedDirectors = {
  items: PublicDirector[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
