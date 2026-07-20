import { describe, expect, it } from 'vitest';
import {
  SignedPaymentVoucherStatus,
  PurchaseOrderStatus,
} from '@luxaria/shared-types';
import {
  customerReceiptPdfSource,
  goodsReceiptPdfSource,
  purchaseOrderPdfSource,
  signedPaymentVoucherPdfSource,
} from './sources';

describe('pdf sources status gates', () => {
  it('blocks voucher PDF before approve', () => {
    const source = signedPaymentVoucherPdfSource({
      voucherPdfDocumentId: null,
      status: SignedPaymentVoucherStatus.Submitted,
    });
    expect(source.kind).toBe('unavailable');
  });

  it('allows voucher PDF when approved with document id', () => {
    const source = signedPaymentVoucherPdfSource({
      voucherPdfDocumentId: '507f1f77bcf86cd799439011',
      status: SignedPaymentVoucherStatus.Approved,
    });
    expect(source).toMatchObject({
      kind: 'document',
      documentId: '507f1f77bcf86cd799439011',
    });
  });

  it('blocks cancelled purchase order PDF', () => {
    const source = purchaseOrderPdfSource({
      id: '507f1f77bcf86cd799439011',
      pdfPath: null,
      status: PurchaseOrderStatus.Cancelled,
    });
    expect(source.kind).toBe('unavailable');
  });

  it('requires posted status for customer receipt without existing path', () => {
    const source = customerReceiptPdfSource({
      id: '507f1f77bcf86cd799439011',
      receiptPdfPath: null,
      status: 'draft',
    });
    expect(source.kind).toBe('unavailable');
  });

  it('uses GRN document ObjectId when present', () => {
    const source = goodsReceiptPdfSource({
      photos: ['uploads/grn/photo1.jpg'],
      challanDocument: '507f1f77bcf86cd799439011',
      weighbridgeDocument: null,
    });
    expect(source).toMatchObject({
      kind: 'document',
      documentId: '507f1f77bcf86cd799439011',
    });
  });

  it('marks GRN unavailable without document ids', () => {
    const source = goodsReceiptPdfSource({
      photos: ['uploads/grn/photo1.jpg'],
      challanDocument: null,
      weighbridgeDocument: null,
    });
    expect(source.kind).toBe('unavailable');
  });
});
