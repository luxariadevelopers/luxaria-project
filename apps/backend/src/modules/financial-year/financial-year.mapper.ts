import type { Types } from 'mongoose';
import type { UnlockRequestStatus } from './schemas/financial-year-unlock-request.schema';
import type { FinancialYearStatus } from './schemas/financial-year.schema';

export type PublicFinancialYear = {
  id: string;
  companyId: string | null;
  name: string;
  startDate: Date;
  endDate: Date;
  status: FinancialYearStatus;
  isCurrent: boolean;
  isLocked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type FyLike = {
  _id: Types.ObjectId | string;
  companyId?: Types.ObjectId | string | null;
  name: string;
  startDate: Date;
  endDate: Date;
  status: FinancialYearStatus;
  isCurrent?: boolean;
  isLocked?: boolean;
  lockedAt?: Date | null;
  lockedBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicFinancialYear(fy: FyLike): PublicFinancialYear {
  return {
    id: String(fy._id),
    companyId: fy.companyId ? String(fy.companyId) : null,
    name: fy.name,
    startDate: fy.startDate,
    endDate: fy.endDate,
    status: fy.status,
    isCurrent: Boolean(fy.isCurrent),
    isLocked: Boolean(fy.isLocked),
    lockedAt: fy.lockedAt ?? null,
    lockedBy: fy.lockedBy ? String(fy.lockedBy) : null,
    createdAt: fy.createdAt,
    updatedAt: fy.updatedAt,
  };
}

export type PublicUnlockRequest = {
  id: string;
  financialYearId: string;
  reason: string;
  requestedBy: string;
  status: UnlockRequestStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  approvalNote: string | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt?: Date;
};
