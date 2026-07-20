import type { Types } from 'mongoose';
import type {
  BankAccountStatus,
  BankAccountType,
} from './schemas/company-bank-account.schema';

export type PublicCompanyBankAccount = {
  id: string;
  accountCode: string;
  bankName: string;
  branch: string | null;
  accountHolderName: string;
  maskedAccountNumber: string;
  /** Only present when caller has bank.view_sensitive / bank.manage */
  accountNumber: string | null;
  ifsc: string;
  accountType: BankAccountType;
  projectId: string | null;
  ledgerAccountId: string;
  openingBalance: number;
  status: BankAccountStatus;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BankBalanceView = {
  bankAccountId: string;
  accountCode: string;
  ledgerAccountId: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  asOf: Date;
};

export type BankLedgerLine = {
  journalId: string;
  journalNumber: string;
  journalDate: Date;
  narration: string;
  lineId: string;
  debit: number;
  credit: number;
  description: string | null;
  projectId: string | null;
  runningBalance?: number;
};

export function toPublicBankAccount(
  row: {
    _id: Types.ObjectId | string;
    accountCode: string;
    bankName: string;
    branch?: string | null;
    accountHolderName: string;
    maskedAccountNumber: string;
    ifsc: string;
    accountType: BankAccountType;
    projectId?: Types.ObjectId | string | null;
    ledgerAccountId: Types.ObjectId | string;
    openingBalance: number;
    status: BankAccountStatus;
    isDefault?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  },
  accountNumber: string | null = null,
): PublicCompanyBankAccount {
  return {
    id: String(row._id),
    accountCode: row.accountCode,
    bankName: row.bankName,
    branch: row.branch ?? null,
    accountHolderName: row.accountHolderName,
    maskedAccountNumber: row.maskedAccountNumber,
    accountNumber,
    ifsc: row.ifsc,
    accountType: row.accountType,
    projectId: row.projectId ? String(row.projectId) : null,
    ledgerAccountId: String(row.ledgerAccountId),
    openingBalance: row.openingBalance,
    status: row.status,
    isDefault: Boolean(row.isDefault),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
