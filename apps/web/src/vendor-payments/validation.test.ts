import { describe, expect, it } from 'vitest';
import {
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '@/vendor-invoices/types';
import type { PayableInvoiceOption } from './types';
import {
  assertAllocationWithinPayable,
  assertAllocationsBalance,
  computeBankAmount,
  filterPayableInvoices,
} from './validation';

describe('vendor-payments validation — allocation / overpayment', () => {
  it('allows partial payment within remaining payable', () => {
    expect(assertAllocationWithinPayable(500, 1000).ok).toBe(true);
    expect(
      assertAllocationsBalance({
        amount: 500,
        allocations: [{ amount: 500 }],
      }).ok,
    ).toBe(true);
  });

  it('rejects overpayment against remaining payable', () => {
    const result = assertAllocationWithinPayable(1200, 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/exceeds remaining payable/);
    }
  });

  it('requires allocation total to equal payment amount', () => {
    expect(
      assertAllocationsBalance({
        amount: 1000,
        allocations: [{ amount: 600 }, { amount: 400 }],
      }).ok,
    ).toBe(true);
    expect(
      assertAllocationsBalance({
        amount: 1000,
        allocations: [{ amount: 600 }],
      }).ok,
    ).toBe(false);
  });

  it('computes bank amount after withholdings', () => {
    const ok = computeBankAmount({
      amount: 1000,
      tds: 100,
      retention: 50,
      deductions: 25,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.bankAmount).toBe(825);
    expect(
      computeBankAmount({
        amount: 100,
        tds: 80,
        retention: 30,
        deductions: 0,
      }).ok,
    ).toBe(false);
  });
});

describe('vendor-payments — payable invoice gate (match / exception)', () => {
  const base: PayableInvoiceOption = {
    id: 'i1',
    documentNumber: 'VI-1',
    invoiceNumber: 'V-1',
    vendorId: 'v1',
    remainingPayable: 500,
    status: VendorInvoiceStatus.Posted,
    matchingStatus: VendorInvoiceMatchingStatus.Matched,
    exceptionApproved: false,
  };

  it('includes matched posted invoices', () => {
    expect(filterPayableInvoices([base])).toHaveLength(1);
  });

  it('excludes unmatched and unapproved exceptions', () => {
    expect(
      filterPayableInvoices([
        {
          ...base,
          matchingStatus: VendorInvoiceMatchingStatus.Pending,
        },
        {
          ...base,
          id: 'i2',
          matchingStatus: VendorInvoiceMatchingStatus.Exception,
          exceptionApproved: false,
        },
      ]),
    ).toHaveLength(0);
  });

  it('includes exception-approved invoices', () => {
    expect(
      filterPayableInvoices([
        {
          ...base,
          matchingStatus: VendorInvoiceMatchingStatus.Exception,
          exceptionApproved: true,
        },
      ]),
    ).toHaveLength(1);
  });

  it('excludes zero remaining payable', () => {
    expect(
      filterPayableInvoices([{ ...base, remainingPayable: 0 }]),
    ).toHaveLength(0);
  });
});
