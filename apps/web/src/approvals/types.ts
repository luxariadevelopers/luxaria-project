import type { PaginationMeta } from '@luxaria/shared-types';
import type { ApprovalStatus } from '@luxaria/shared-types';

/** Mirrors `PublicApprovalHistory` from approvals.mapper.ts (JSON dates as ISO). */
export type PublicApprovalHistory = {
  historyId: string;
  stepNumber: number;
  action: string;
  actorId: string;
  comment: string | null;
  at: string;
};

/** Mirrors `PublicApprovalRequest` from approvals.mapper.ts. */
export type PublicApprovalRequest = {
  id: string;
  approvalCode: string;
  module: string;
  entityType: string;
  entityId: string;
  projectId: string;
  workflowId: string;
  requestedBy: string;
  requestedAt: string;
  amount: number;
  currentStep: number;
  status: ApprovalStatus | string;
  reason: string | null;
  stepEnteredAt: string | null;
  escalated: boolean;
  approvalHistory: PublicApprovalHistory[];
  createdAt?: string;
  updatedAt?: string;
};

export type ListApprovalsQuery = {
  page?: number;
  limit?: number;
  status?: ApprovalStatus | string;
  module?: string;
  entityType?: string;
};

export type ApprovalsListResult = {
  items: PublicApprovalRequest[];
  meta: PaginationMeta | null;
};
