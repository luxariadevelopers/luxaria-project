/**
 * Mirrors `apps/backend/src/modules/directors` public mapper shapes
 * and web `apps/web/src/directors/types.ts`.
 */

export const DirectorStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Resigned: 'resigned',
} as const;

export type DirectorStatus =
  (typeof DirectorStatus)[keyof typeof DirectorStatus];

export type PublicDirector = {
  id: string;
  companyId: string | null;
  directorCode: string;
  userId: string | null;
  userCode: string | null;
  employeeId: string | null;
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
  userId: string;
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
  userId?: string;
  din?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  appointmentDate?: string | null;
  status?: DirectorStatus;
};

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedDirectors = {
  items: PublicDirector[];
  meta: PaginatedMeta;
};

export type ShareCapitalDirectorLine = {
  directorId: string;
  numberOfShares: number;
  faceValue: number;
  amount: number;
};

export type ShareCapitalReceiptResult = {
  journalId: string | null;
  journalNumber: string | null;
  bankAccountId: string;
  receivedDate: string;
  totalAmount: number;
  directorLines: ShareCapitalDirectorLine[];
  paidUpShareCapital: number;
};

export type DirectorUserOption = {
  id: string;
  fullName: string;
  userCode: string;
  employeeId?: string | null;
  email?: string | null;
  status: string;
};

export type CompanyBankAccountOption = {
  id: string;
  bankName: string;
  maskedAccountNumber: string;
  isDefault: boolean;
  status: string;
};
