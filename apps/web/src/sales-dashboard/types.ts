export type SalesDashboardKpis = {
  projectId: string | null;
  companyId: string | null;
  asOf: string;
  leadsTotal: number;
  leadsByStatus: Record<string, number>;
  conversions: number;
  reservations: number;
  bookings: number;
  salesValue: number;
  collectionEfficiency: {
    demanded: number;
    collectedFromDemands: number;
    postedReceipts: number;
    ratio: number;
  };
  outstandingDues: number;
  cancellationRate: {
    cancelled: number;
    total: number;
    ratio: number;
  };
};

export type SalesDashboardQuery = {
  projectId?: string;
  companyId?: string;
};
