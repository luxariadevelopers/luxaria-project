import { describe, expect, it } from 'vitest';
import { applyExpenseClientFilters } from './applyClientFilters';
import {
  SiteExpensePaymentMode,
  SiteExpenseVoucherStatus,
  type PublicSiteExpenseVoucher,
} from './types';

function row(
  id: string,
  expenseDate: string,
): PublicSiteExpenseVoucher {
  return {
    id,
    voucherNumber: `EXP-${id}`,
    projectId: 'p1',
    pettyCashAccountId: 'c1',
    expenseDate,
    expenseCategoryId: 'cat1',
    amount: 100,
    paidTo: 'A',
    mobileNumber: null,
    purpose: 'x',
    boqItemId: null,
    paymentMode: SiteExpensePaymentMode.Cash,
    billNumber: null,
    billDate: null,
    attachments: [],
    latitude: null,
    longitude: null,
    deviceId: null,
    submittedBy: null,
    submittedAt: null,
    status: SiteExpenseVoucherStatus.Submitted,
    warnings: [],
    journalEntryId: null,
    debitAccountId: null,
    verifiedBy: null,
    verifiedAt: null,
    approvedBy: null,
    approvedAt: null,
    postedBy: null,
    postedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
  };
}

describe('applyExpenseClientFilters', () => {
  it('filters by inclusive date range', () => {
    const rows = [
      row('1', '2026-07-01'),
      row('2', '2026-07-10'),
      row('3', '2026-07-20'),
    ];
    const filtered = applyExpenseClientFilters(rows, {
      dateFrom: '2026-07-05',
      dateTo: '2026-07-15',
    });
    expect(filtered.map((r) => r.id)).toEqual(['2']);
  });
});
