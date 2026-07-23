/**
 * Mirrors Nest `PublicSiteExpenseVoucher` /
 * `apps/backend/src/modules/site-expense-vouchers`.
 */

import { SiteExpenseVoucherStatus } from '@/status';

export { SiteExpenseVoucherStatus };
export type { SiteExpenseVoucherStatus as SiteExpenseVoucherStatusType } from '@/status';

/** Nest `SiteExpensePaymentMode` */
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

export type PublicSiteExpenseAttachment = {
  id: string;
  type: SiteExpenseAttachmentType;
  fileName: string | null;
  filePath: string | null;
  documentId: string | null;
  mimeType: string | null;
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
  mobileNumber: string | null;
  purpose: string;
  boqItemId: string | null;
  paymentMode: SiteExpensePaymentMode;
  billNumber: string | null;
  billDate: string | null;
  attachments: PublicSiteExpenseAttachment[];
  latitude: number | null;
  longitude: number | null;
  deviceId: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  status: SiteExpenseVoucherStatus;
  warnings: string[];
  journalEntryId: string | null;
  debitAccountId: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListSiteExpenseVouchersQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  pettyCashAccountId?: string;
  expenseCategoryId?: string;
  status?: SiteExpenseVoucherStatus;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedSiteExpenseVouchers = {
  items: PublicSiteExpenseVoucher[];
  meta: PaginationMeta;
};

/** Nest `RejectSiteExpenseVoucherDto.reason` */
export type RejectSiteExpenseInput = {
  reason: string;
};

/** Nest `ReturnSiteExpenseVoucherDto.comment` */
export type ReturnSiteExpenseInput = {
  comment?: string | null;
};

/** Nest `CancelSiteExpenseVoucherDto.cancellationReason` */
export type CancelSiteExpenseInput = {
  cancellationReason: string;
};

export type SiteExpenseAttachmentInput = {
  type: SiteExpenseAttachmentType;
  documentId?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  mimeType?: string | null;
};

/** Nest `CreateSiteExpenseVoucherDto` (web create subset). */
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
  billNumber?: string | null;
  billDate?: string | null;
  attachments?: SiteExpenseAttachmentInput[];
};

/** Nest `UpdateSiteExpenseVoucherDto` — draft/returned patches (incl. signatures). */
export type UpdateSiteExpenseInput = Partial<
  Omit<CreateSiteExpenseInput, 'projectId'>
>;

// Aliases for list-module imports (Phase 052)
export type RejectSiteExpenseVoucherInput = RejectSiteExpenseInput;
export type ReturnSiteExpenseVoucherInput = ReturnSiteExpenseInput;
export type CancelSiteExpenseVoucherInput = CancelSiteExpenseInput;
