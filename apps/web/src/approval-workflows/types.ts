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

export type PublicApprovalWorkflow = {
  id: string;
  module: string;
  entityType: string;
  name: string | null;
  isActive: boolean;
  allowSelfApprove: boolean;
  steps: PublicApprovalStep[];
};

export type ApprovalStepInput = {
  stepNumber: number;
  roleIds?: string[];
  specificUserIds?: string[];
  minimumAmount?: number;
  maximumAmount?: number | null;
  requiresAll?: boolean;
  escalationHours?: number | null;
  fallbackRole?: string | null;
};

export type UpsertApprovalWorkflowInput = {
  module: string;
  entityType: string;
  name?: string | null;
  allowSelfApprove?: boolean;
  steps: ApprovalStepInput[];
};

export type ApprovalWorkflowFormState = {
  name: string;
  allowSelfApprove: boolean;
  steps: PublicApprovalStep[];
};

export type WorkflowPreset = {
  label: string;
  module: string;
  entityType: string;
};
