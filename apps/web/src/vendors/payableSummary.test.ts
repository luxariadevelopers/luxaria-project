import { describe, expect, it } from 'vitest';
import { buildVendorPayableSummary } from './payableSummary';
import {
  VendorInvoiceStatus,
  VendorPaymentStatus,
  type PublicVendorInvoiceRow,
  type PublicVendorPaymentRow,
  type VendorLedgerReport,
} from './types';

const invoice = (
  overrides: Partial<PublicVendorInvoiceRow>,
): PublicVendorInvoiceRow => ({
  id: 'i1',
  documentNumber: 'VI-2026-000001',
  invoiceNumber: 'INV-1',
  vendorId: 'v1',
  projectId: 'p1',
  invoiceDate: '2026-01-01',
  dueDate: '2026-01-31',
  totalAmount: 1000,
  paidAmount: 200,
  remainingPayable: 800,
  status: VendorInvoiceStatus.Posted,
  ...overrides,
});

const payment = (
  overrides: Partial<PublicVendorPaymentRow>,
): PublicVendorPaymentRow => ({
  id: 'pay1',
  paymentNumber: 'VP-2026-000001',
  vendorId: 'v1',
  projectId: 'p1',
  paymentDate: '2026-01-15',
  amount: 200,
  bankAmount: 180,
  paymentMode: 'neft',
  status: VendorPaymentStatus.Posted,
  transactionReference: 'UTR1',
  ...overrides,
});

describe('buildVendorPayableSummary', () => {
  it('sums invoice remaining/paid and payment amounts', () => {
    const ledger: VendorLedgerReport = {
      vendorId: 'v1',
      vendorCode: 'VEN-000001',
      legalName: 'Acme',
      currency: 'INR',
      openingBalance: 0,
      totalDebit: 1000,
      totalCredit: 200,
      closingBalance: 800,
      rows: [],
      filters: null,
      reconciled: true,
      reconciliationNotes: [],
      asOf: '2026-01-20T00:00:00.000Z',
    };

    const summary = buildVendorPayableSummary({
      invoices: [
        invoice({ remainingPayable: 800, paidAmount: 200 }),
        invoice({
          id: 'i2',
          remainingPayable: 100,
          paidAmount: 50,
          totalAmount: 150,
        }),
      ],
      payments: [payment({ amount: 200 }), payment({ id: 'pay2', amount: 50 })],
      ledger,
    });

    expect(summary.openPayable).toBe(900);
    expect(summary.paidTotal).toBe(250);
    expect(summary.paymentAmountTotal).toBe(250);
    expect(summary.invoiceCount).toBe(2);
    expect(summary.paymentCount).toBe(2);
    expect(summary.ledgerClosingBalance).toBe(800);
    expect(summary.currency).toBe('INR');
  });
});
