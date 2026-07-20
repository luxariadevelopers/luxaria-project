export enum ConstructionReportType {
  BoqBudgetVsActual = 'boq-budget-vs-actual',
  PlannedVsActualProgress = 'planned-vs-actual-progress',
  MaterialReceiptReport = 'material-receipt-report',
  MaterialIssueReport = 'material-issue-report',
  StockBalance = 'stock-balance',
  StockMovement = 'stock-movement',
  MaterialConsumptionVariance = 'material-consumption-variance',
  MaterialWastage = 'material-wastage',
  PurchaseCommitment = 'purchase-commitment',
  OpenPurchaseOrders = 'open-purchase-orders',
  VendorPerformance = 'vendor-performance',
  LabourAttendance = 'labour-attendance',
  ContractorManpowerShortfall = 'contractor-manpower-shortfall',
  ContractorProgress = 'contractor-progress',
  RunningBillRegister = 'running-bill-register',
  DailyProgressSummary = 'daily-progress-summary',
  ProjectDelayReport = 'project-delay-report',
}

export const ALL_CONSTRUCTION_REPORTS = Object.values(ConstructionReportType);

export const CONSTRUCTION_REPORT_LABELS: Record<
  ConstructionReportType,
  string
> = {
  [ConstructionReportType.BoqBudgetVsActual]: 'BOQ Budget vs Actual',
  [ConstructionReportType.PlannedVsActualProgress]:
    'Planned vs Actual Progress',
  [ConstructionReportType.MaterialReceiptReport]: 'Material Receipt Report',
  [ConstructionReportType.MaterialIssueReport]: 'Material Issue Report',
  [ConstructionReportType.StockBalance]: 'Stock Balance',
  [ConstructionReportType.StockMovement]: 'Stock Movement',
  [ConstructionReportType.MaterialConsumptionVariance]:
    'Material Consumption Variance',
  [ConstructionReportType.MaterialWastage]: 'Material Wastage',
  [ConstructionReportType.PurchaseCommitment]: 'Purchase Commitment',
  [ConstructionReportType.OpenPurchaseOrders]: 'Open Purchase Orders',
  [ConstructionReportType.VendorPerformance]: 'Vendor Performance',
  [ConstructionReportType.LabourAttendance]: 'Labour Attendance',
  [ConstructionReportType.ContractorManpowerShortfall]:
    'Contractor Manpower Shortfall',
  [ConstructionReportType.ContractorProgress]: 'Contractor Progress',
  [ConstructionReportType.RunningBillRegister]: 'Running Bill Register',
  [ConstructionReportType.DailyProgressSummary]: 'Daily Progress Summary',
  [ConstructionReportType.ProjectDelayReport]: 'Project Delay Report',
};

export type ConstructionExportFormat = 'pdf' | 'xlsx';
