import { BadRequestException } from '@nestjs/common';
import {
  VendorInvoiceVarianceSeverity,
  VendorInvoiceVarianceType,
} from './schemas/vendor-invoice.schema';
import {
  assertHeaderTotals,
  buildQuantityVariance,
  buildRateVariance,
  normalizeInvoiceNumber,
  summarizeMatchingStatus,
} from './vendor-invoices.validation';

describe('vendor-invoices.validation', () => {
  it('normalizes invoice numbers', () => {
    expect(normalizeInvoiceNumber(' inv-100 ')).toBe('INV-100');
    expect(() => normalizeInvoiceNumber('  ')).toThrow(BadRequestException);
  });

  it('requires totalAmount = taxable + gst + freight', () => {
    expect(() =>
      assertHeaderTotals({
        taxableValue: 1000,
        gst: 180,
        freight: 20,
        totalAmount: 1199,
        tds: 0,
        retention: 0,
      }),
    ).toThrow(/must equal/);
  });

  it('accepts balanced header totals', () => {
    expect(() =>
      assertHeaderTotals({
        taxableValue: 1000,
        gst: 180,
        freight: 20,
        totalAmount: 1200,
        tds: 10,
        retention: 5,
      }),
    ).not.toThrow();
  });

  it('flags quantity and rate variances', () => {
    const qty = buildQuantityVariance({
      materialId: null,
      invoicedQty: 12,
      grnAcceptedQty: 10,
      tolerancePercent: 0,
    });
    expect(qty?.type).toBe(VendorInvoiceVarianceType.Quantity);
    expect(qty?.severity).toBe(VendorInvoiceVarianceSeverity.Exception);

    const rate = buildRateVariance({
      materialId: null,
      invoiceRate: 420,
      poRate: 400,
      tolerancePercent: 0,
    });
    expect(rate?.type).toBe(VendorInvoiceVarianceType.Rate);
    expect(rate?.severity).toBe(VendorInvoiceVarianceSeverity.Exception);
  });

  it('summarizes matching status from severities', () => {
    expect(summarizeMatchingStatus([])).toBe('matched');
    expect(
      summarizeMatchingStatus([
        { severity: VendorInvoiceVarianceSeverity.Warning },
      ]),
    ).toBe('matched_with_tolerance');
    expect(
      summarizeMatchingStatus([
        { severity: VendorInvoiceVarianceSeverity.Exception },
      ]),
    ).toBe('exception');
  });
});
