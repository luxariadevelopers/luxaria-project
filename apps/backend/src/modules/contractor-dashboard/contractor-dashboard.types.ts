export type ContractorDashboardQuery = {
  projectId?: string;
  companyId?: string;
  withinDays?: number;
};

export type ContractorDashboardKpis = {
  projectId: string | null;
  companyId: string | null;
  asOf: string;
  openWorkOrders: {
    available: boolean;
    count: number;
  };
  pendingBills: {
    available: boolean;
    count: number;
    amount: number;
  };
  retentionHeld: {
    available: boolean;
    amount: number;
  };
  outstandingPayable: {
    available: boolean;
    amount: number;
  };
  complianceExpiries: {
    available: boolean;
    withinDays: number;
    count: number;
    labourLicence: number;
    insurance: number;
  };
};
