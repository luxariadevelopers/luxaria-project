/** Mirrors `InvestorVisibleReportType` on the backend. */
export const InvestorVisibleReportType = {
  Progress: 'progress',
  FinancialSummary: 'financial_summary',
  BoardUpdate: 'board_update',
  Other: 'other',
} as const;

export type InvestorVisibleReportType =
  (typeof InvestorVisibleReportType)[keyof typeof InvestorVisibleReportType];

export type PublishInvestorReportInput = {
  projectId: string;
  title: string;
  reportType: InvestorVisibleReportType;
  summary?: string;
  documentPath?: string;
};

export type PublishedInvestorReport = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  publishedAt: string | null;
};

export type RecordInvestorProfitInput = {
  projectId: string;
  participantId: string;
  financialYearId?: string;
  periodLabel?: string;
  allocatedAmount: number;
  distributedAmount?: number;
  notes?: string;
  approvedAt?: string;
};

export type RecordedInvestorProfitAllocation = {
  id: string;
  projectId: string;
  participantId: string;
  investorId: string;
  allocatedAmount: number;
  distributedAmount: number;
  undistributedAmount: number;
};

export type UpdateDistributedProfitInput = {
  distributedAmount: number;
};

export type UpdatedInvestorProfitAllocation = {
  id: string;
  allocatedAmount: number;
  distributedAmount: number;
  undistributedAmount: number;
};

/** Session-persisted row for PATCH distributed (no list GET on backend). */
export type RecentProfitAllocationRow = RecordedInvestorProfitAllocation & {
  participantLabel: string | null;
  recordedAt: string;
};
