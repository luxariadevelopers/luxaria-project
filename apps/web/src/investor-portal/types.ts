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

export type InvestorPortalProjectDetail = {
  project: {
    id: string;
    projectCode: string;
    projectName: string;
    projectStage: string;
    status: string;
  };
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
  reports: unknown[];
  agreements: unknown[];
  receipts: unknown[];
  restrictions: {
    otherInvestorsVisible: false;
    companyFinancialsVisible: false;
    vendorPersonalDataVisible: false;
    customerPersonalDataVisible: false;
  };
};
