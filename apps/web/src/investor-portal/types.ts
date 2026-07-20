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
