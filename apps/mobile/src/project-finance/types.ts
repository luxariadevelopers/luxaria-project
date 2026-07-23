export const AccountCategory = {
  Bank: 'bank',
  Cash: 'cash',
  PettyCash: 'petty_cash',
  DirectorAccount: 'director_account',
  InvestorAccount: 'investor_account',
  Loan: 'loan',
  Interest: 'interest',
  Sales: 'sales',
  OtherIncome: 'other_income',
  LandCost: 'land_cost',
  MaterialPurchase: 'material_purchase',
  DirectExpense: 'direct_expense',
  IndirectExpense: 'indirect_expense',
  WorkInProgress: 'work_in_progress',
} as const;

export type AccountCategory =
  (typeof AccountCategory)[keyof typeof AccountCategory];

export const AccountType = {
  Asset: 'asset',
  Liability: 'liability',
  Equity: 'equity',
  Income: 'income',
  Expense: 'expense',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const AccountStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type PublicAccount = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountCategory: string;
  status: string;
  allowManualPosting?: boolean;
  requiresProject?: boolean;
};

export type CreateAccountInput = {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory | string;
  parentAccountId?: string | null;
  isControlAccount?: boolean;
  allowManualPosting?: boolean;
  requiresProject?: boolean;
  requiresParty?: boolean;
};

export const CostCentreKind = {
  CostCentre: 'cost_centre',
  ProfitCentre: 'profit_centre',
} as const;

export type CostCentreKind =
  (typeof CostCentreKind)[keyof typeof CostCentreKind];

export type PublicCostCentre = {
  id: string;
  code: string;
  name: string;
  kind: CostCentreKind | string;
  projectId: string | null;
  status: string;
  notes?: string | null;
};

export type CreateCostCentreInput = {
  code: string;
  name: string;
  kind: CostCentreKind;
  projectId?: string | null;
  notes?: string | null;
};

export type LedgerLineRow = {
  journalId: string;
  journalNumber: string;
  journalDate: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  narration: string;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  projectId: string | null;
  partyType: string | null;
  partyId: string | null;
  fundingSource: string | null;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
};

export type CashBankBookPayload = {
  openingBalance: number;
  closingBalance: number;
  rows: LedgerLineRow[];
  totals?: {
    debit: number;
    credit: number;
    openingBalance: number;
    closingBalance: number;
  };
};

export type FinancialYearOption = {
  id: string;
  name: string;
  isCurrent: boolean;
  isLocked?: boolean;
};

export type ProjectFinanceEntryKind = 'income' | 'expense' | 'transfer';
