export enum AccountingReportType {
  TrialBalance = 'trial-balance',
  GeneralLedger = 'general-ledger',
  JournalRegister = 'journal-register',
  CashBook = 'cash-book',
  BankBook = 'bank-book',
  ProjectCostSheet = 'project-cost-sheet',
  ProjectProfitAndLoss = 'project-profit-and-loss',
  BalanceSheet = 'balance-sheet',
  CompanyProfitAndLoss = 'company-profit-and-loss',
  VendorLedger = 'vendor-ledger',
  ContractorLedger = 'contractor-ledger',
  DirectorLedger = 'director-ledger',
  InvestorLedger = 'investor-ledger',
  CustomerLedger = 'customer-ledger',
  CustomerAdvanceReport = 'customer-advance-report',
  AccountsPayableAgeing = 'accounts-payable-ageing',
  AccountsReceivableAgeing = 'accounts-receivable-ageing',
  SourceAndUtilisationOfFunds = 'source-and-utilisation-of-funds',
  CashFlow = 'cash-flow',
  ProjectFundFlow = 'project-fund-flow',
}

export const ALL_ACCOUNTING_REPORTS = Object.values(AccountingReportType);

export const ACCOUNTING_REPORT_LABELS: Record<AccountingReportType, string> = {
  [AccountingReportType.TrialBalance]: 'Trial Balance',
  [AccountingReportType.GeneralLedger]: 'General Ledger',
  [AccountingReportType.JournalRegister]: 'Journal Register',
  [AccountingReportType.CashBook]: 'Cash Book',
  [AccountingReportType.BankBook]: 'Bank Book',
  [AccountingReportType.ProjectCostSheet]: 'Project Cost Sheet',
  [AccountingReportType.ProjectProfitAndLoss]: 'Project Profit and Loss',
  [AccountingReportType.BalanceSheet]: 'Company Balance Sheet',
  [AccountingReportType.CompanyProfitAndLoss]: 'Company Profit and Loss',
  [AccountingReportType.VendorLedger]: 'Vendor Ledger',
  [AccountingReportType.ContractorLedger]: 'Contractor Ledger',
  [AccountingReportType.DirectorLedger]: 'Director Ledger',
  [AccountingReportType.InvestorLedger]: 'Investor Ledger',
  [AccountingReportType.CustomerLedger]: 'Customer Ledger',
  [AccountingReportType.CustomerAdvanceReport]: 'Customer Advance Report',
  [AccountingReportType.AccountsPayableAgeing]: 'Accounts Payable Ageing',
  [AccountingReportType.AccountsReceivableAgeing]: 'Accounts Receivable Ageing',
  [AccountingReportType.SourceAndUtilisationOfFunds]:
    'Source and Utilisation of Funds',
  [AccountingReportType.CashFlow]: 'Cash Flow',
  [AccountingReportType.ProjectFundFlow]: 'Project Fund Flow',
};

export type AccountingExportFormat = 'pdf' | 'xlsx';
