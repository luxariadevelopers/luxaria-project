/** Capital plan block from `GET /projects/:id/dashboard`. */
export type CapitalPlanPartyRow = {
  participantRecordId: string;
  partyId: string;
  name: string;
  profitSharePercent: number;
  expectedAmount: number;
  investedAmount: number;
  pendingAmount: number;
  budgetPercent: number | null;
  instrumentType: string | null;
  repaymentMode: string | null;
  interestRate: number | null;
  repayHint: string | null;
};

export type CapitalPlanSummary = {
  approvedBudget: number;
  totalInvested: number;
  pendingToInvest: number;
  equalDirectorInvestment: boolean;
  directorsEqual: boolean;
  directors: CapitalPlanPartyRow[];
  investors: CapitalPlanPartyRow[];
};

export type CapitalDirectorRow = {
  directorId: string;
  profitSharePercent: string;
  commitmentAmount: string;
};

export type CapitalInvestorRow = {
  investorId: string;
  budgetInvestmentPercentage: string;
  commitmentAmount: string;
  profitSharePercent: string;
  instrumentType: 'project_investment' | 'unsecured_loan';
  repaymentMode: '' | 'lumpsum' | 'with_interest';
  interestRate: string;
};

export type CapitalPlanFormValues = {
  approvedBudget: string;
  equalDirectorInvestment: boolean;
  capitalDirectors: CapitalDirectorRow[];
  capitalInvestors: CapitalInvestorRow[];
};

export type PartyOption = {
  id: string;
  label: string;
};
