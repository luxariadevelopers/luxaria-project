export const SiteExpensePaymentMode = {
  Cash: 'cash',
  Upi: 'upi',
  BankTransfer: 'bank_transfer',
  Cheque: 'cheque',
  Other: 'other',
} as const;

export type SiteExpensePaymentMode =
  (typeof SiteExpensePaymentMode)[keyof typeof SiteExpensePaymentMode];

export type PublicSiteExpenseVoucher = {
  id: string;
  voucherNumber: string;
  projectId: string;
  pettyCashAccountId: string;
  expenseDate: string;
  expenseCategoryId: string;
  amount: number;
  paidTo: string;
  purpose: string;
  paymentMode: SiteExpensePaymentMode;
  status: string;
  mobileNumber?: string | null;
};

export type CreateSiteExpenseInput = {
  projectId: string;
  pettyCashAccountId: string;
  expenseDate: string;
  expenseCategoryId: string;
  amount: number;
  paidTo: string;
  purpose: string;
  paymentMode: SiteExpensePaymentMode;
  mobileNumber?: string | null;
};

export type CashAccountOption = { id: string; accountName: string; accountCode?: string };
export type ExpenseCategoryOption = { id: string; name: string; code?: string };
