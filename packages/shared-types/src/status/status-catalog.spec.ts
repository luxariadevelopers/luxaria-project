import {
  ApprovalStatus,
  BookingStatus,
  DOMAIN_STATUS_CATALOGS,
  JournalStatus,
  PurchaseOrderStatus,
  approvalStatusCatalog,
  bookingStatusCatalog,
  getDomainStatusDisplay,
  getDomainStatusLabel,
  journalStatusCatalog,
  purchaseOrderStatusCatalog,
  purchaseRequestStatusCatalog,
} from './index';

describe('shared domain status catalogs', () => {
  it('maps known labels consistently', () => {
    expect(approvalStatusCatalog.label(ApprovalStatus.Pending)).toBe('Pending');
    expect(journalStatusCatalog.label(JournalStatus.PendingApproval)).toBe(
      'Pending Approval',
    );
    expect(purchaseOrderStatusCatalog.label(PurchaseOrderStatus.Issued)).toBe(
      'Issued',
    );
    expect(bookingStatusCatalog.label(BookingStatus.Agreement)).toBe(
      'Agreement',
    );
  });

  it('rejects unknown statuses with safe fallback display', () => {
    const display = approvalStatusCatalog.display('not_a_real_status');
    expect(display.known).toBe(false);
    expect(display.label).toBe('Unknown');
    expect(display.badgeVariant).toBe('muted');
    expect(approvalStatusCatalog.parse('bogus')).toBeNull();
    expect(approvalStatusCatalog.isKnown('bogus')).toBe(false);
  });

  it('allows custom fallback labels for unknown statuses', () => {
    expect(getDomainStatusLabel('journal', 'xyz', '—')).toBe('—');
    expect(getDomainStatusDisplay('booking', 'xyz', '—').label).toBe('—');
  });

  it('enforces booking transitions from backend matrix', () => {
    expect(
      bookingStatusCatalog.canTransition(
        BookingStatus.Hold,
        BookingStatus.Reserved,
      ),
    ).toBe(true);
    expect(
      bookingStatusCatalog.canTransition(
        BookingStatus.Hold,
        BookingStatus.Booked,
      ),
    ).toBe(false);
    expect(
      bookingStatusCatalog.canTransition(
        BookingStatus.Registered,
        BookingStatus.Cancelled,
      ),
    ).toBe(false);
    expect(
      bookingStatusCatalog.allowedTransitions(BookingStatus.Reserved),
    ).toEqual(['booked', 'cancelled']);
  });

  it('enforces journal transitions from service rules', () => {
    expect(
      journalStatusCatalog.canTransition(
        JournalStatus.Draft,
        JournalStatus.Posted,
      ),
    ).toBe(true);
    expect(
      journalStatusCatalog.canTransition(
        JournalStatus.Posted,
        JournalStatus.Draft,
      ),
    ).toBe(false);
    expect(
      journalStatusCatalog.canTransition(
        JournalStatus.Posted,
        JournalStatus.Reversed,
      ),
    ).toBe(true);
    expect(journalStatusCatalog.isImmutable(JournalStatus.Posted)).toBe(true);
    expect(journalStatusCatalog.isEditable(JournalStatus.Draft)).toBe(true);
  });

  it('returns badge variants for known statuses', () => {
    expect(approvalStatusCatalog.badgeVariant(ApprovalStatus.Approved)).toBe(
      'success',
    );
    expect(approvalStatusCatalog.badgeVariant(ApprovalStatus.Rejected)).toBe(
      'danger',
    );
    expect(purchaseRequestStatusCatalog.badgeVariant('returned')).toBe(
      'warning',
    );
  });

  it('registers every phase-003 domain catalog', () => {
    expect(Object.keys(DOMAIN_STATUS_CATALOGS).sort()).toEqual([
      'approval',
      'booking',
      'contractorBill',
      'goodsReceipt',
      'journal',
      'purchaseOrder',
      'purchaseRequest',
      'signedPaymentVoucher',
      'siteExpenseVoucher',
      'vendorInvoice',
      'vendorInvoiceMatching',
    ]);
  });

  it('rejects transitions involving unknown statuses', () => {
    expect(approvalStatusCatalog.canTransition('draft', 'not_real')).toBe(
      false,
    );
    expect(approvalStatusCatalog.canTransition('not_real', 'draft')).toBe(
      false,
    );
  });
});
