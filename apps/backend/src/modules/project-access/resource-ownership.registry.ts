/**
 * Maps logical resource types used by @ProjectScoped({ resource }) to
 * Mongoose model names and the field holding project ownership.
 */
export type ResourceOwnershipDefinition = {
  modelName: string;
  projectIdField: string;
  companyIdField?: string | null;
  /** When the resource id IS the project id (e.g. projects/:id). */
  idIsProjectId?: boolean;
};

export const RESOURCE_OWNERSHIP_REGISTRY: Record<
  string,
  ResourceOwnershipDefinition
> = {
  project: {
    modelName: 'Project',
    projectIdField: '_id',
    companyIdField: 'companyId',
    idIsProjectId: true,
  },
  'purchase-order': {
    modelName: 'PurchaseOrder',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'purchase-request': {
    modelName: 'PurchaseRequest',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'goods-receipt': {
    modelName: 'GoodsReceipt',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'vendor-invoice': {
    modelName: 'VendorInvoice',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'vendor-payment': {
    modelName: 'VendorPayment',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'vendor-quotation': {
    modelName: 'VendorQuotation',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'quotation-comparison': {
    modelName: 'QuotationComparison',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  journal: {
    modelName: 'JournalEntry',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'contribution-receipt': {
    modelName: 'ContributionReceipt',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'contractor-bill': {
    modelName: 'ContractorBill',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'contractor-payment': {
    modelName: 'ContractorPayment',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'contractor-agreement': {
    modelName: 'ContractorAgreement',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'contractor-tender': {
    modelName: 'ContractorTender',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'contractor-recovery': {
    modelName: 'ContractorRecovery',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'contractor-material-reconciliation': {
    modelName: 'ContractorMaterialReconciliation',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'contractor-retention': {
    modelName: 'ContractorRetention',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'rate-contract': {
    modelName: 'RateContract',
    projectIdField: 'projectId',
    companyIdField: 'companyId',
  },
  'work-order': {
    modelName: 'WorkOrder',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'work-measurement': {
    modelName: 'WorkMeasurement',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'measurement-book': {
    modelName: 'MeasurementBookEntry',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  booking: {
    modelName: 'Booking',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'booking-cancellation': {
    modelName: 'BookingCancellation',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'customer-receipt': {
    modelName: 'CustomerReceipt',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'payment-schedule': {
    modelName: 'PaymentSchedule',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'payment-demand': {
    modelName: 'PaymentDemand',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  unit: {
    modelName: 'Unit',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  document: {
    modelName: 'StoredDocument',
    projectIdField: 'projectId',
    companyIdField: 'companyId',
  },
  approval: {
    modelName: 'ApprovalRequest',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  boq: {
    modelName: 'BoqVersion',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'stock-count': {
    modelName: 'StockCount',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'material-issue': {
    modelName: 'MaterialIssue',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'material-consumption': {
    modelName: 'MaterialConsumptionReport',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  dpr: {
    modelName: 'DailyProgressReport',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  drawing: {
    modelName: 'Drawing',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  equipment: {
    modelName: 'Equipment',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'equipment-utilization': {
    modelName: 'EquipmentUtilization',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'site-quality': {
    modelName: 'SiteQuality',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'site-safety': {
    modelName: 'SiteSafety',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'labour-attendance': {
    modelName: 'LabourAttendance',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'petty-cash-requirement': {
    modelName: 'PettyCashRequirement',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'site-expense-voucher': {
    modelName: 'SiteExpenseVoucher',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'signed-payment-voucher': {
    modelName: 'SignedPaymentVoucher',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'project-participant': {
    modelName: 'ProjectParticipant',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'project-commitment': {
    modelName: 'ContributionCommitment',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'quality-inspection': {
    modelName: 'QualityInspection',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'manpower-shortfall': {
    modelName: 'ManpowerShortfallAlert',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'cash-account': {
    modelName: 'CashAccount',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'bank-reconciliation-session': {
    modelName: 'BankReconciliationSession',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'investor-profit-allocation': {
    modelName: 'InvestorProfitAllocation',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'investor-visible-report': {
    modelName: 'InvestorVisibleReport',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'site-issue': {
    modelName: 'SiteIssue',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'site-diary': {
    modelName: 'SiteDiaryEntry',
    projectIdField: 'projectId',
    companyIdField: null,
  },
  'site-photo': {
    modelName: 'SitePhoto',
    projectIdField: 'projectId',
    companyIdField: null,
  },
};
