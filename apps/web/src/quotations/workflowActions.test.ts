import { describe, expect, it } from 'vitest';
import type { QuotationCapabilities } from './roleAccess';
import { VendorQuotationStatus, type PublicVendorQuotation } from './types';
import { resolveQuotationRowActions } from './workflowActions';

const caps: QuotationCapabilities = {
  canView: true,
  canManage: true,
  canFinalize: true,
};

function row(
  status: PublicVendorQuotation['status'],
): PublicVendorQuotation {
  return {
    id: 'q1',
    quotationNumber: 'VQ-2026-000001',
    purchaseRequestId: 'pr1',
    projectId: 'p1',
    vendorId: 'v1',
    quotationDate: '2026-07-17',
    validityDate: '2026-08-17',
    deliveryDays: 7,
    paymentTerms: null,
    freight: 0,
    taxes: 0,
    discount: 0,
    items: [],
    quotationDocument: null,
    status,
    revisionNumber: 1,
    rootQuotationId: 'q1',
    revisedFromId: null,
    finalizedBy: null,
    finalizedAt: null,
    itemsSubtotal: 0,
    grandTotal: 0,
  };
}

describe('resolveQuotationRowActions', () => {
  it('allows edit/submit/upload/cancel on draft when manage', () => {
    expect(resolveQuotationRowActions(row(VendorQuotationStatus.Draft), caps)).toEqual(
      ['edit', 'submit', 'upload', 'cancel'],
    );
  });

  it('allows revise + finalise on submitted', () => {
    expect(
      resolveQuotationRowActions(row(VendorQuotationStatus.Submitted), caps),
    ).toEqual(['revise', 'finalise', 'cancel']);
  });

  it('allows revise on final but not finalise again', () => {
    expect(
      resolveQuotationRowActions(row(VendorQuotationStatus.Final), caps),
    ).toEqual(['revise']);
  });

  it('hides manage actions without quotation.manage', () => {
    const viewOnly: QuotationCapabilities = {
      canView: true,
      canManage: false,
      canFinalize: false,
    };
    expect(
      resolveQuotationRowActions(row(VendorQuotationStatus.Draft), viewOnly),
    ).toEqual([]);
  });

  it('adds create_po for submitted/final when purchase.order allowed', () => {
    expect(
      resolveQuotationRowActions(row(VendorQuotationStatus.Final), caps, {
        canCreatePurchaseOrder: true,
      }),
    ).toEqual(['revise', 'create_po']);
    expect(
      resolveQuotationRowActions(row(VendorQuotationStatus.Submitted), caps, {
        canCreatePurchaseOrder: true,
      }),
    ).toContain('create_po');
  });
});
