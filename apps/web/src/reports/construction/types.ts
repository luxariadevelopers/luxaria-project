/** Nest `ConstructionReportType` + catalogue / payload shapes. */

export const ConstructionReportType = {
  BoqBudgetVsActual: 'boq-budget-vs-actual',
  PlannedVsActualProgress: 'planned-vs-actual-progress',
  MaterialReceiptReport: 'material-receipt-report',
  MaterialIssueReport: 'material-issue-report',
  StockBalance: 'stock-balance',
  StockMovement: 'stock-movement',
  MaterialConsumptionVariance: 'material-consumption-variance',
  MaterialWastage: 'material-wastage',
  PurchaseCommitment: 'purchase-commitment',
  OpenPurchaseOrders: 'open-purchase-orders',
  VendorPerformance: 'vendor-performance',
  LabourAttendance: 'labour-attendance',
  ContractorManpowerShortfall: 'contractor-manpower-shortfall',
  ContractorProgress: 'contractor-progress',
  RunningBillRegister: 'running-bill-register',
  DailyProgressSummary: 'daily-progress-summary',
  ProjectDelayReport: 'project-delay-report',
} as const;

export type ConstructionReportType =
  (typeof ConstructionReportType)[keyof typeof ConstructionReportType];

export type ConstructionReportCatalogueItem = {
  reportType: ConstructionReportType;
  title: string;
  path: string;
  exportPath: string;
};

export type ConstructionReportQuery = {
  projectId?: string;
  from?: string;
  to?: string;
  contractorId?: string;
  vendorId?: string;
  materialId?: string;
};

export type ConstructionReportPayload = {
  meta: {
    reportType: string;
    title: string;
    generatedAt: string;
    filters: Record<string, unknown>;
  };
  rows: Record<string, unknown>[];
  totals?: Record<string, number | string | null> | null;
};
