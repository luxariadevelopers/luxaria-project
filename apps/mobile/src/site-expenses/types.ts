/** Mirrors Nest / `@luxaria/shared-types` site expense statuses. */
export const SiteExpenseVoucherStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Verified: 'verified',
  Approved: 'approved',
  Posted: 'posted',
  Rejected: 'rejected',
  Returned: 'returned',
  Cancelled: 'cancelled',
} as const;

export type SiteExpenseVoucherStatus =
  (typeof SiteExpenseVoucherStatus)[keyof typeof SiteExpenseVoucherStatus];

export const SiteExpensePaymentMode = {
  Cash: 'cash',
  Upi: 'upi',
  BankTransfer: 'bank_transfer',
  Cheque: 'cheque',
  Other: 'other',
} as const;

export type SiteExpensePaymentMode =
  (typeof SiteExpensePaymentMode)[keyof typeof SiteExpensePaymentMode];

/** Nest `SiteExpenseAttachmentType` */
export const SiteExpenseAttachmentType = {
  Bill: 'bill',
  Photo: 'photo',
  Signature: 'signature',
  Other: 'other',
} as const;

export type SiteExpenseAttachmentType =
  (typeof SiteExpenseAttachmentType)[keyof typeof SiteExpenseAttachmentType];

export type SiteExpenseAttachmentInput = {
  type: SiteExpenseAttachmentType;
  documentId?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  mimeType?: string | null;
};

export type PublicSiteExpenseAttachment = {
  id?: string;
  type: SiteExpenseAttachmentType | string;
  fileName?: string | null;
  filePath?: string | null;
  documentId?: string | null;
  mimeType?: string | null;
};

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
  attachments?: PublicSiteExpenseAttachment[];
  journalEntryId?: string | null;
  postedAt?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
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
  attachments?: SiteExpenseAttachmentInput[];
};

export type UpdateSiteExpenseInput = Partial<
  Omit<CreateSiteExpenseInput, 'projectId'>
>;

export type RejectSiteExpenseInput = {
  reason: string;
};

export type ReturnSiteExpenseInput = {
  comment?: string | null;
};

export type CancelSiteExpenseInput = {
  cancellationReason: string;
};

export type CashAccountOption = {
  id: string;
  accountName: string;
  accountCode?: string;
};

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  code?: string;
  requiresSignature?: boolean;
  requiresBill?: boolean;
  requiresPhoto?: boolean;
};

/** Local editable draft persisted on device (not a server voucher). */
export type SiteExpenseLocalDraft = {
  id: string;
  projectId: string;
  pettyCashAccountId: string;
  expenseCategoryId: string;
  expenseDate: string;
  /** Form amount string — parsed on submit. */
  amount: string;
  paidTo: string;
  purpose: string;
  paymentMode: SiteExpensePaymentMode;
  mobileNumber?: string | null;
  /** Local signature file while drafting. */
  signatureUri?: string | null;
  signatureName?: string | null;
  signatureMimeType?: string | null;
  signatureSize?: number | null;
  /** Local bill/photo file while drafting. */
  photoUri?: string | null;
  photoName?: string | null;
  photoMimeType?: string | null;
  photoSize?: number | null;
  /** Category evidence flags snapshot (for offline resume). */
  requiresSignature?: boolean;
  requiresBill?: boolean;
  requiresPhoto?: boolean;
  createdAt: string;
  updatedAt: string;
};
