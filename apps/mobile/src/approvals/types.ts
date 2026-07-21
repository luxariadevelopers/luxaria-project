export type PublicApprovalRequest = {
  id: string;
  approvalCode: string;
  module: string;
  entityType: string;
  entityId: string;
  projectId: string;
  amount: number;
  status: string;
  reason: string | null;
  currentStep: number;
  requestedAt: string;
};
