/** Mirrors `apps/backend/src/modules/investor-portal/investor-portal.types.ts`. */
export type InvestorPortalMe = {
  investorId: string;
  investorCode: string;
  legalName: string;
  investorType: string;
  status: string;
  kycStatus: string;
};

export type InvestorPortalProjectSummary = {
  projectId: string;
  projectCode: string;
  projectName: string;
  projectStage: string;
  status: string;
  commitmentAmount: number;
  amountContributed: number;
  pendingContribution: number;
  approvedProfitSharePercentage: number;
  physicalProgressPercent: number;
};

export type InvestorPortalAgreement = {
  id: string;
  category: string;
  fileName: string;
  mimeType: string | null;
  uploadedAt: string | null;
};

export type InvestorPortalReceipt = {
  id: string;
  receiptNumber: string;
  receivedDate: string;
  amount: number;
  paymentMode: string;
  hasDocument: boolean;
};

export type InvestorPortalReport = {
  id: string;
  title: string;
  reportType: string;
  summary: string | null;
  documentPath: string | null;
  publishedAt: string | null;
};

export type InvestorPortalProjectDetail = {
  project: {
    id: string;
    projectCode: string;
    projectName: string;
    projectStage: string;
    status: string;
  };
  /** Own participant investment only — never other investors. */
  investment: {
    participantId: string;
    commitmentAmount: number;
    amountContributed: number;
    pendingContribution: number;
    approvedProfitSharePercentage: number;
    lossSharePercentage: number;
    instrumentType: string;
  };
  progress: {
    physicalProgressPercent: number;
    plannedQuantity: number;
    measuredQuantity: number;
  };
  budget: {
    approvedBudget: number;
    revisedBudget: number;
    fundsUtilised: number;
    utilisationPercent: number;
  };
  profit: {
    allocatedAmount: number;
    distributedProfit: number;
    undistributedProfit: number;
  };
  reports: InvestorPortalReport[];
  agreements: InvestorPortalAgreement[];
  receipts: InvestorPortalReceipt[];
  /**
   * Explicit denial of sensitive company/third-party surfaces.
   * Useful for clients and permission tests.
   */
  restrictions: {
    otherInvestorsVisible: false;
    companyFinancialsVisible: false;
    vendorPersonalDataVisible: false;
    customerPersonalDataVisible: false;
  };
};

export type InvestorDocumentKind = 'agreement' | 'report';

export type AggregatedInvestorDocument = {
  id: string;
  kind: InvestorDocumentKind;
  projectId: string;
  projectCode: string;
  projectName: string;
  title: string;
  category: string | null;
  fileName: string | null;
  mimeType: string | null;
  documentPath: string | null;
  uploadedAt: string | null;
};

export type AggregatedInvestorStatement = {
  id: string;
  kind: 'report' | 'receipt';
  projectId: string;
  projectCode: string;
  projectName: string;
  title: string;
  reportType: string | null;
  summary: string | null;
  documentPath: string | null;
  publishedAt: string | null;
  receivedDate: string | null;
  amount: number | null;
  paymentMode: string | null;
  hasDocument: boolean;
};

export type InvestorStatementFilters = {
  projectId: string | 'all';
  kind: 'all' | 'report' | 'receipt';
  reportType: string | 'all';
  fromDate: string | null;
  toDate: string | null;
};

export const DEFAULT_STATEMENT_FILTERS: InvestorStatementFilters = {
  projectId: 'all',
  kind: 'all',
  reportType: 'all',
  fromDate: null,
  toDate: null,
};

export const INVESTOR_REPORT_TYPE_OPTIONS = [
  { value: 'all', label: 'All report types' },
  { value: 'progress', label: 'Progress' },
  { value: 'financial_summary', label: 'Financial summary' },
  { value: 'board_update', label: 'Board update' },
  { value: 'other', label: 'Other' },
] as const;
