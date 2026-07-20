/** Mirrors Nest `MaterialConsumptionReportStatus`. */
export enum MaterialConsumptionReportStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  Cancelled = 'cancelled',
}

/** Mirrors Nest `MaterialConsumptionAlert`. */
export enum MaterialConsumptionAlert {
  AboveAllowedVariance = 'above_allowed_variance',
  NegativeConsumption = 'negative_consumption',
  MaterialIssueWithoutProgress = 'material_issue_without_progress',
  ProgressWithoutMaterialIssue = 'progress_without_material_issue',
  UnexplainedStockShortage = 'unexplained_stock_shortage',
}

export enum MaterialConsumptionStandardSource {
  ConsumptionStandard = 'consumption_standard',
  BoqCoefficient = 'boq_coefficient',
  None = 'none',
}

export type MaterialConsumptionLine = {
  id: string;
  boqItemId: string;
  boqCode: string | null;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  baseUnit: string;
  workQuantityCompleted: number;
  coefficient: number;
  standardMaterialRequirement: number;
  wastagePercentage: number;
  allowedWastage: number;
  expectedConsumption: number;
  actualMaterialIssued: number;
  materialReturned: number;
  netActualConsumption: number;
  varianceQuantity: number;
  variancePercentage: number;
  varianceValue: number;
  standardRate: number;
  standardSource: MaterialConsumptionStandardSource;
  alerts: MaterialConsumptionAlert[];
  requiresApproval: boolean;
  explanation: string | null;
  explainedBy: string | null;
  explainedAt: string | null;
};

export type MaterialConsumptionReport = {
  id: string;
  reportNumber: string;
  projectId: string;
  periodFrom: string | null;
  periodTo: string | null;
  asOfDate: string;
  lines: MaterialConsumptionLine[];
  status: MaterialConsumptionReportStatus;
  requiresApproval: boolean;
  notes: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalComment: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MaterialConsumptionPreview = {
  projectId: string;
  periodFrom: string | null;
  periodTo: string | null;
  asOfDate: string;
  lines: MaterialConsumptionLine[];
  requiresApproval: boolean;
};

export type ListMaterialConsumptionReportsQuery = {
  projectId?: string;
  status?: MaterialConsumptionReportStatus;
  requiresApproval?: boolean;
  page?: number;
  limit?: number;
};

export type GenerateMaterialConsumptionReportInput = {
  projectId: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  asOfDate?: string;
  notes?: string | null;
};

export type PreviewMaterialConsumptionQuery = {
  projectId: string;
  periodFrom?: string;
  periodTo?: string;
  asOfDate?: string;
};

export type LineExplanationInput = {
  lineId: string;
  explanation: string;
};

export type UpdateMaterialConsumptionReportInput = {
  notes?: string | null;
  explanations?: LineExplanationInput[];
};

export type ApproveMaterialConsumptionReportInput = {
  approvalComment?: string;
};

export type LineEvidenceDraft = {
  lineId: string;
  files: File[];
  note?: string;
};
