import type { Types } from 'mongoose';
import type { ApprovalHistoryAction } from './schemas/approval-history.schema';
import type {
  ApprovalHistorySnapshot,
  ApprovalStatus,
} from './schemas/approval-request.schema';
import type { ApprovalStepConfig } from './schemas/approval-workflow.schema';

const oid = (value: Types.ObjectId | string | null | undefined): string | null =>
  value ? String(value) : null;

export type PublicApprovalStep = {
  stepNumber: number;
  roleIds: string[];
  specificUserIds: string[];
  minimumAmount: number;
  maximumAmount: number | null;
  requiresAll: boolean;
  escalationHours: number | null;
  fallbackRole: string | null;
};

export type PublicApprovalHistory = {
  historyId: string;
  stepNumber: number;
  action: string;
  actorId: string;
  comment: string | null;
  at: Date;
};

export type PublicApprovalRequest = {
  id: string;
  approvalCode: string;
  module: string;
  entityType: string;
  entityId: string;
  projectId: string;
  workflowId: string;
  requestedBy: string;
  requestedAt: Date;
  amount: number;
  currentStep: number;
  status: ApprovalStatus;
  reason: string | null;
  stepEnteredAt: Date | null;
  escalated: boolean;
  approvalHistory: PublicApprovalHistory[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicApprovalWorkflow = {
  id: string;
  module: string;
  entityType: string;
  name: string | null;
  isActive: boolean;
  allowSelfApprove: boolean;
  steps: PublicApprovalStep[];
};

export type PublicTimelineEntry = {
  id: string;
  approvalRequestId: string;
  approvalCode: string;
  stepNumber: number;
  action: ApprovalHistoryAction;
  actorId: string;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  at: Date;
};

export function toPublicStep(step: ApprovalStepConfig): PublicApprovalStep {
  return {
    stepNumber: step.stepNumber,
    roleIds: (step.roleIds ?? []).map(String),
    specificUserIds: (step.specificUserIds ?? []).map(String),
    minimumAmount: step.minimumAmount ?? 0,
    maximumAmount: step.maximumAmount ?? null,
    requiresAll: Boolean(step.requiresAll),
    escalationHours: step.escalationHours ?? null,
    fallbackRole: oid(step.fallbackRole),
  };
}

export function toPublicHistorySnapshot(
  row: ApprovalHistorySnapshot,
): PublicApprovalHistory {
  return {
    historyId: String(row.historyId),
    stepNumber: row.stepNumber,
    action: row.action,
    actorId: String(row.actorId),
    comment: row.comment ?? null,
    at: row.at,
  };
}

export function toPublicApprovalRequest(row: {
  _id: Types.ObjectId;
  approvalCode: string;
  module: string;
  entityType: string;
  entityId: Types.ObjectId;
  projectId: Types.ObjectId;
  workflowId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  amount: number;
  currentStep: number;
  status: ApprovalStatus;
  reason?: string | null;
  stepEnteredAt?: Date | null;
  escalated?: boolean;
  approvalHistory?: ApprovalHistorySnapshot[];
  createdAt?: Date;
  updatedAt?: Date;
}): PublicApprovalRequest {
  return {
    id: String(row._id),
    approvalCode: row.approvalCode,
    module: row.module,
    entityType: row.entityType,
    entityId: String(row.entityId),
    projectId: String(row.projectId),
    workflowId: String(row.workflowId),
    requestedBy: String(row.requestedBy),
    requestedAt: row.requestedAt,
    amount: row.amount,
    currentStep: row.currentStep,
    status: row.status,
    reason: row.reason ?? null,
    stepEnteredAt: row.stepEnteredAt ?? null,
    escalated: Boolean(row.escalated),
    approvalHistory: (row.approvalHistory ?? []).map(toPublicHistorySnapshot),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicWorkflow(row: {
  _id: Types.ObjectId;
  module: string;
  entityType: string;
  name?: string | null;
  isActive: boolean;
  allowSelfApprove?: boolean;
  steps: ApprovalStepConfig[];
}): PublicApprovalWorkflow {
  return {
    id: String(row._id),
    module: row.module,
    entityType: row.entityType,
    name: row.name ?? null,
    isActive: row.isActive,
    allowSelfApprove: Boolean(row.allowSelfApprove),
    steps: [...row.steps]
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map(toPublicStep),
  };
}
