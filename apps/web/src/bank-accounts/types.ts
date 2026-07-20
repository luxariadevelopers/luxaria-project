/**
 * Mirrors Nest public shapes from
 * `apps/backend/src/modules/company-bank-accounts`.
 */

export const BankAccountType = {
  Current: 'current',
  Savings: 'savings',
  Overdraft: 'overdraft',
  CashCredit: 'cash_credit',
  Escrow: 'escrow',
  Other: 'other',
} as const;

export type BankAccountType =
  (typeof BankAccountType)[keyof typeof BankAccountType];

export const BankAccountStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type BankAccountStatus =
  (typeof BankAccountStatus)[keyof typeof BankAccountStatus];

export type PublicCompanyBankAccount = {
  id: string;
  accountCode: string;
  bankName: string;
  branch: string | null;
  accountHolderName: string;
  maskedAccountNumber: string;
  /** Only present when Nest decrypts (`bank.view_sensitive` / `bank.manage`). */
  accountNumber: string | null;
  ifsc: string;
  accountType: BankAccountType;
  projectId: string | null;
  ledgerAccountId: string;
  openingBalance: number;
  status: BankAccountStatus;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type BankBalanceView = {
  bankAccountId: string;
  accountCode: string;
  ledgerAccountId: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  asOf: string;
};

export type BankLedgerLine = {
  journalId: string;
  journalNumber: string;
  journalDate: string;
  narration: string;
  lineId: string;
  debit: number;
  credit: number;
  description: string | null;
  projectId: string | null;
  runningBalance?: number;
};

export type ListCompanyBankAccountsQuery = {
  page?: number;
  limit?: number;
  status?: BankAccountStatus;
  projectId?: string;
  companyOnly?: boolean;
  search?: string;
};

export type BankLedgerQuery = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedBankAccounts = {
  items: PublicCompanyBankAccount[];
  meta: PaginationMeta;
};

export type PaginatedBankLedger = {
  items: BankLedgerLine[];
  meta: PaginationMeta & {
    bankAccountId?: string;
    accountCode?: string;
    openingBalance?: number;
  };
};

export type CreateCompanyBankAccountInput = {
  bankName: string;
  branch?: string | null;
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  accountType: BankAccountType;
  projectId?: string | null;
  ledgerAccountId: string;
  openingBalance?: number;
  isDefault?: boolean;
};

export type UpdateCompanyBankAccountInput = {
  bankName?: string;
  branch?: string | null;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  accountType?: BankAccountType;
  projectId?: string | null;
  ledgerAccountId?: string;
  openingBalance?: number;
  isDefault?: boolean;
};

export type SetDefaultBankAccountInput = {
  projectId?: string | null;
};
