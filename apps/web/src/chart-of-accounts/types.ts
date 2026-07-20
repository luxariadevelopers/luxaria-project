/**
 * Mirrors `apps/backend/src/modules/chart-of-accounts` public shapes.
 */

export const AccountType = {
  Asset: 'asset',
  Liability: 'liability',
  Equity: 'equity',
  Income: 'income',
  Expense: 'expense',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const AccountCategory = {
  Bank: 'bank',
  Cash: 'cash',
  PettyCash: 'petty_cash',
  DirectorAccount: 'director_account',
  InvestorAccount: 'investor_account',
  CustomerAdvance: 'customer_advance',
  VendorPayable: 'vendor_payable',
  ContractorPayable: 'contractor_payable',
  LabourPayable: 'labour_payable',
  MaterialPurchase: 'material_purchase',
  WorkInProgress: 'work_in_progress',
  LandCost: 'land_cost',
  DirectExpense: 'direct_expense',
  IndirectExpense: 'indirect_expense',
  InputGst: 'input_gst',
  OutputGst: 'output_gst',
  TdsPayable: 'tds_payable',
  RetentionPayable: 'retention_payable',
  Loan: 'loan',
  Interest: 'interest',
  Sales: 'sales',
  OtherIncome: 'other_income',
  Control: 'control',
} as const;

export type AccountCategory =
  (typeof AccountCategory)[keyof typeof AccountCategory];

export const AccountStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type AccountStatus =
  (typeof AccountStatus)[keyof typeof AccountStatus];

export type PublicAccount = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountId: string | null;
  level: number;
  isControlAccount: boolean;
  allowManualPosting: boolean;
  requiresProject: boolean;
  requiresParty: boolean;
  status: AccountStatus;
  postingCount: number;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountTreeNode = PublicAccount & {
  children: AccountTreeNode[];
};

export type CreateAccountInput = {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountId?: string | null;
  isControlAccount?: boolean;
  allowManualPosting?: boolean;
  requiresProject?: boolean;
  requiresParty?: boolean;
};

export type UpdateAccountInput = Partial<
  Omit<CreateAccountInput, 'accountCode'>
>;

export type ListAccountsQuery = {
  page?: number;
  limit?: number;
  accountType?: AccountType;
  accountCategory?: AccountCategory;
  status?: AccountStatus;
  search?: string;
  parentAccountId?: string;
  rootsOnly?: boolean;
};

export type SeedStandardResult = {
  created: number;
  skipped: number;
  total: number;
};
