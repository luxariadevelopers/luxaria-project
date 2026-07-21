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

export type InvestorProfitAllocationPublic = {
  id: string;
  projectId: string;
  participantId: string;
  investorId: string;
  periodLabel: string | null;
  allocatedAmount: number;
  distributedAmount: number;
  undistributedAmount: number;
  status: string;
  approvedAt: string | null;
  createdAt: string | null;
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
