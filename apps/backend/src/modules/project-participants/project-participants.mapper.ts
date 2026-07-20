import type { Types } from 'mongoose';
import type { ParticipantDocumentCategory } from './schemas/project-participant-document.schema';
import type {
  InstrumentType,
  ParticipantApprovalStatus,
  ParticipantType,
} from './schemas/project-participant.schema';

export type PublicProjectParticipant = {
  id: string;
  projectId: string;
  participantType: ParticipantType;
  participantId: string;
  participantKey: string;
  participantLabel: string | null;
  commitmentAmount: number;
  expectedContributionDate: Date | null;
  actualContributionAmount: number;
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
  interestRate: number | null;
  instrumentType: InstrumentType;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  agreementDocumentId: string | null;
  status: ParticipantApprovalStatus;
  version: number;
  supersedesId: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicParticipantDocument = {
  id: string;
  participantRecordId: string;
  projectId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  category: ParticipantDocumentCategory;
  uploadedBy: string | null;
  createdAt?: Date;
};

type ParticipantLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  participantType: ParticipantType;
  participantId: Types.ObjectId | string;
  participantKey: string;
  participantLabel?: string | null;
  commitmentAmount: number;
  expectedContributionDate?: Date | null;
  actualContributionAmount: number;
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
  interestRate?: number | null;
  instrumentType: InstrumentType;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  agreementDocumentId?: Types.ObjectId | string | null;
  status: ParticipantApprovalStatus;
  version: number;
  supersedesId?: Types.ObjectId | string | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  rejectedBy?: Types.ObjectId | string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicParticipant(
  row: ParticipantLike,
): PublicProjectParticipant {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    participantType: row.participantType,
    participantId: String(row.participantId),
    participantKey: row.participantKey,
    participantLabel: row.participantLabel ?? null,
    commitmentAmount: row.commitmentAmount,
    expectedContributionDate: row.expectedContributionDate ?? null,
    actualContributionAmount: row.actualContributionAmount,
    approvedProfitSharePercentage: row.approvedProfitSharePercentage,
    lossSharePercentage: row.lossSharePercentage,
    interestRate: row.interestRate ?? null,
    instrumentType: row.instrumentType,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? null,
    agreementDocumentId: row.agreementDocumentId
      ? String(row.agreementDocumentId)
      : null,
    status: row.status,
    version: row.version,
    supersedesId: row.supersedesId ? String(row.supersedesId) : null,
    submittedBy: row.submittedBy ? String(row.submittedBy) : null,
    submittedAt: row.submittedAt ?? null,
    approvedBy: row.approvedBy ? String(row.approvedBy) : null,
    approvedAt: row.approvedAt ?? null,
    rejectedBy: row.rejectedBy ? String(row.rejectedBy) : null,
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
