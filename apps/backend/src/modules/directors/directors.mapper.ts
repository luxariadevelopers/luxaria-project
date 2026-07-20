import type { Types } from 'mongoose';
import type { DirectorDocumentCategory } from './schemas/director-document.schema';
import type { DirectorStatus } from './schemas/director.schema';
import type { ShareholdingChangeStatus } from './schemas/shareholding-change-request.schema';

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
  appointmentDate: Date | null;
  status: DirectorStatus;
  isPlaceholder: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type DirectorLike = {
  _id: Types.ObjectId | string;
  companyId?: Types.ObjectId | string | null;
  directorCode: string;
  userId?: Types.ObjectId | string | null;
  fullName: string;
  din?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  appointmentDate?: Date | null;
  status: DirectorStatus;
  isPlaceholder?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicDirector(director: DirectorLike): PublicDirector {
  return {
    id: String(director._id),
    companyId: director.companyId ? String(director.companyId) : null,
    directorCode: director.directorCode,
    userId: director.userId ? String(director.userId) : null,
    fullName: director.fullName,
    din: director.din ?? null,
    pan: director.pan ?? null,
    email: director.email ?? null,
    phone: director.phone ?? null,
    address: director.address ?? null,
    appointmentDate: director.appointmentDate ?? null,
    status: director.status,
    isPlaceholder: Boolean(director.isPlaceholder),
    createdAt: director.createdAt,
    updatedAt: director.updatedAt,
  };
}

export type PublicShareholding = {
  id: string;
  companyId: string;
  directorId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  numberOfShares: number;
  faceValue: number;
  percentage: number;
  approvalReference: string | null;
  documentId: string | null;
  version: number;
  changeRequestId: string | null;
  createdAt?: Date;
};

export type PublicShareholdingChangeRequest = {
  id: string;
  companyId: string;
  reason: string;
  approvalReference: string | null;
  proposedHoldings: Array<{
    directorId: string;
    numberOfShares: number;
    faceValue: number;
    percentage: number;
    documentId: string | null;
  }>;
  status: ShareholdingChangeStatus;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  approvalNote: string | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  appliedVersion: number | null;
  createdAt?: Date;
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
  createdAt?: Date;
};
