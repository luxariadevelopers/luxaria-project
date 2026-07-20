import { BadRequestException } from '@nestjs/common';
import {
  VendorInvoiceMatchingStatus,
  VendorInvoiceVarianceType,
} from './schemas/vendor-invoice.schema';
import {
  assertInvoicePaymentAllowed,
  buildFieldVariance,
  runThreeWayMatch,
  summarizeThreeWayStatus,
  type ThreeWayTolerances,
} from './three-way-matching.engine';
import { VendorInvoiceVarianceSeverity } from './schemas/vendor-invoice.schema';

const zeroTol: ThreeWayTolerances = {
  quantityPercent: 0,
  ratePercent: 0,
  taxPercent: 0,
  freightPercent: 0,
  discountPercent: 0,
  totalPercent: 0,
};

describe('three-way-matching.engine', () => {
  it('matches a clean PO / GRN / invoice triangle', () => {
    const result = runThreeWayMatch({
      po: {
        taxes: 0,
        freight: 0,
        discount: 0,
        total: 40000,
        items: [
          {
            id: 'line1',
            materialId: 'mat1',
            quantity: 100,
            rate: 400,
            tax: 0,
            discount: 0,
            total: 40000,
          },
        ],
      },
      invoice: {
        gst: 0,
        freight: 0,
        discount: 0,
        totalAmount: 4000,
        items: [
          {
            materialId: 'mat1',
            materialCode: 'MAT-1',
            purchaseOrderLineId: 'line1',
            quantity: 10,
            rate: 400,
            tax: 0,
            amount: 4000,
          },
        ],
      },
      remainingGrnAcceptedByKey: new Map([['line:line1', 10]]),
      tolerances: zeroTol,
    });

    expect(result.matchingStatus).toBe(VendorInvoiceMatchingStatus.Matched);
    expect(result.variances).toHaveLength(0);
  });

  it('explains quantity, rate, tax, freight, discount and total mismatches', () => {
    const result = runThreeWayMatch({
      po: {
        taxes: 1800,
        freight: 500,
        discount: 200,
        total: 42100,
        items: [
          {
            id: 'line1',
            materialId: 'mat1',
            quantity: 100,
            rate: 400,
            tax: 1800,
            discount: 0,
            total: 40000,
          },
        ],
      },
      invoice: {
        gst: 0,
        freight: 0,
        discount: 0,
        totalAmount: 4500,
        items: [
          {
            materialId: 'mat1',
            materialCode: 'MAT-1',
            purchaseOrderLineId: 'line1',
            quantity: 12,
            rate: 450,
            tax: 50,
            amount: 5450,
          },
        ],
      },
      remainingGrnAcceptedByKey: new Map([['line:line1', 10]]),
      tolerances: zeroTol,
    });

    expect(result.matchingStatus).toBe(VendorInvoiceMatchingStatus.Exception);
    const types = new Set(result.variances.map((v) => v.type));
    expect(types.has(VendorInvoiceVarianceType.Quantity)).toBe(true);
    expect(types.has(VendorInvoiceVarianceType.Rate)).toBe(true);
    expect(types.has(VendorInvoiceVarianceType.Tax)).toBe(true);
    expect(types.has(VendorInvoiceVarianceType.Freight)).toBe(true);
    expect(types.has(VendorInvoiceVarianceType.Discount)).toBe(true);
    expect(types.has(VendorInvoiceVarianceType.Total)).toBe(true);
    expect(result.variances.every((v) => v.message.length > 0)).toBe(true);
  });

  it('flags unknown material as exception', () => {
    const result = runThreeWayMatch({
      po: {
        taxes: 0,
        freight: 0,
        discount: 0,
        total: 100,
        items: [
          {
            id: 'line1',
            materialId: 'mat1',
            quantity: 1,
            rate: 100,
            tax: 0,
            discount: 0,
            total: 100,
          },
        ],
      },
      invoice: {
        gst: 0,
        freight: 0,
        discount: 0,
        totalAmount: 100,
        items: [
          {
            materialId: 'matX',
            materialCode: 'OTHER',
            purchaseOrderLineId: null,
            quantity: 1,
            rate: 100,
            tax: 0,
            amount: 100,
          },
        ],
      },
      remainingGrnAcceptedByKey: new Map(),
      tolerances: zeroTol,
    });

    expect(
      result.variances.some((v) => v.type === VendorInvoiceVarianceType.Material),
    ).toBe(true);
  });

  it('uses tolerance to produce matched_with_tolerance', () => {
    const soft = buildFieldVariance({
      type: VendorInvoiceVarianceType.Rate,
      fieldLabel: 'Rate',
      expected: 100,
      actual: 102,
      tolerancePercent: 5,
    });
    expect(soft?.severity).toBe(VendorInvoiceVarianceSeverity.Warning);
    expect(summarizeThreeWayStatus([soft!])).toBe(
      VendorInvoiceMatchingStatus.MatchedWithTolerance,
    );
  });

  it('blocks payment until match or exception approval', () => {
    expect(() =>
      assertInvoicePaymentAllowed({
        status: 'posted',
        matchingStatus: VendorInvoiceMatchingStatus.Pending,
        exceptionApproved: false,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertInvoicePaymentAllowed({
        status: 'posted',
        matchingStatus: VendorInvoiceMatchingStatus.Exception,
        exceptionApproved: false,
      }),
    ).toThrow(/exceptions require approval/);

    expect(() =>
      assertInvoicePaymentAllowed({
        status: 'posted',
        matchingStatus: VendorInvoiceMatchingStatus.Rejected,
        exceptionApproved: false,
      }),
    ).toThrow(/rejected/);

    expect(() =>
      assertInvoicePaymentAllowed({
        status: 'posted',
        matchingStatus: VendorInvoiceMatchingStatus.Matched,
        exceptionApproved: false,
      }),
    ).not.toThrow();

    expect(() =>
      assertInvoicePaymentAllowed({
        status: 'posted',
        matchingStatus: VendorInvoiceMatchingStatus.Exception,
        exceptionApproved: true,
      }),
    ).not.toThrow();
  });
});
