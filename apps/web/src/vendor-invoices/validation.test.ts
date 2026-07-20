import { describe, expect, it } from 'vitest';
import {
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
  type PublicVendorInvoice,
} from './types';
import {
  assertHeaderTotals,
  assertInvoiceDates,
  findDuplicateVendorInvoice,
  findGrnQuantityOverages,
  isDuplicateVendorInvoiceMessage,
  normalizeInvoiceNumber,
} from './validation';
import { summarizeMatchingStatusPreview } from './tolerance';

function baseInvoice(
  overrides: Partial<PublicVendorInvoice> = {},
): PublicVendorInvoice {
  return {
    id: 'inv1',
    documentNumber: 'VI-2026-000001',
    invoiceNumber: 'VEN-001',
    vendorId: 'vendor1',
    projectId: 'proj1',
    purchaseOrderId: 'po1',
    grnIds: ['grn1'],
    invoiceDate: '2026-07-01',
    dueDate: '2026-07-31',
    taxableValue: 1000,
    gst: 180,
    tds: 0,
    retention: 0,
    freight: 0,
    discount: 0,
    totalAmount: 1180,
    paidAmount: 0,
    remainingPayable: 1180,
    invoiceDocument: null,
    items: [],
    variances: [],
    matchingStatus: VendorInvoiceMatchingStatus.Pending,
    exceptionApproved: false,
    exceptionApprovedBy: null,
    exceptionApprovedAt: null,
    exceptionApprovedComment: null,
    matchingRejectedBy: null,
    matchingRejectedAt: null,
    matchingRejectionReason: null,
    status: VendorInvoiceStatus.Draft,
    journalEntryId: null,
    notes: null,
    submittedBy: null,
    submittedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    matchedBy: null,
    matchedAt: null,
    approvedBy: null,
    approvedAt: null,
    postedBy: null,
    postedAt: null,
    paidBy: null,
    paidAt: null,
    ...overrides,
  };
}

describe('vendor-invoices validation — duplicate conflict', () => {
  it('normalizes invoice numbers uppercase', () => {
    expect(normalizeInvoiceNumber('  ab-12  ')).toBe('AB-12');
  });

  it('finds duplicate vendor invoice numbers (soft client check)', () => {
    const existing = [
      baseInvoice({ id: 'a', invoiceNumber: 'INV-9', vendorId: 'v1' }),
      baseInvoice({ id: 'b', invoiceNumber: 'OTHER', vendorId: 'v2' }),
    ];
    expect(
      findDuplicateVendorInvoice(existing, 'v1', 'inv-9')?.id,
    ).toBe('a');
    expect(findDuplicateVendorInvoice(existing, 'v1', 'inv-9', 'a')).toBeNull();
    expect(findDuplicateVendorInvoice(existing, 'v2', 'inv-9')).toBeNull();
  });

  it('detects Nest duplicate conflict message', () => {
    expect(
      isDuplicateVendorInvoiceMessage(
        'Duplicate vendor invoice number INV-9 for this vendor',
      ),
    ).toBe(true);
    expect(isDuplicateVendorInvoiceMessage('validation failed')).toBe(false);
  });
});

describe('vendor-invoices validation — dates and totals', () => {
  it('rejects due date before invoice date', () => {
    expect(assertInvoiceDates('2026-07-10', '2026-07-01').ok).toBe(false);
    expect(assertInvoiceDates('2026-07-01', '2026-07-10').ok).toBe(true);
  });

  it('enforces taxable + gst + freight = total', () => {
    expect(
      assertHeaderTotals({
        taxableValue: 1000,
        gst: 180,
        freight: 20,
        totalAmount: 1200,
        tds: 0,
        retention: 0,
      }).ok,
    ).toBe(true);
    expect(
      assertHeaderTotals({
        taxableValue: 1000,
        gst: 180,
        freight: 20,
        totalAmount: 1100,
        tds: 0,
        retention: 0,
      }).ok,
    ).toBe(false);
  });
});

describe('vendor-invoices validation — GRN accepted qty', () => {
  it('flags invoice qty above GRN accepted', () => {
    const accepted = new Map([['mat1', 10]]);
    const overages = findGrnQuantityOverages(
      [
        {
          materialId: 'mat1',
          quantity: 12,
          unit: 'bag',
          rate: 100,
        },
      ],
      accepted,
    );
    expect(overages).toEqual([
      { materialId: 'mat1', invoiced: 12, accepted: 10 },
    ]);
  });
});

describe('tolerance status preview', () => {
  it('maps severities to matching statuses', () => {
    expect(summarizeMatchingStatusPreview([])).toBe('matched');
    expect(
      summarizeMatchingStatusPreview([{ severity: 'warning' }]),
    ).toBe('matched_with_tolerance');
    expect(
      summarizeMatchingStatusPreview([
        { severity: 'warning' },
        { severity: 'exception' },
      ]),
    ).toBe('exception');
  });
});
