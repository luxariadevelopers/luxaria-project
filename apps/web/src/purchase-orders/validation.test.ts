import { describe, expect, it } from 'vitest';
import { MaterialUnit, type ApprovedSourceLine } from './types';
import {
  assertItemsMatchApprovedSource,
  assertOrderDeliveryDates,
  buildPurchaseOrderCreatePath,
  purchaseOrderFormSchema,
} from './validation';

const SOURCE: ApprovedSourceLine[] = [
  {
    materialId: '507f1f77bcf86cd799439011',
    materialCode: 'CEM-01',
    materialName: 'Cement',
    quantity: 100,
    unit: MaterialUnit.Bag,
    rate: 380,
    tax: 684,
    discount: 0,
  },
];

describe('assertOrderDeliveryDates', () => {
  it('accepts delivery on or after order date', () => {
    expect(assertOrderDeliveryDates('2026-07-17', '2026-08-01').ok).toBe(true);
    expect(assertOrderDeliveryDates('2026-07-17', '2026-07-17').ok).toBe(true);
  });

  it('rejects delivery earlier than order date', () => {
    const result = assertOrderDeliveryDates('2026-08-01', '2026-07-01');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/earlier than order date/);
    }
  });
});

describe('assertItemsMatchApprovedSource', () => {
  it('accepts matching rate/unit and qty within approved source', () => {
    expect(
      assertItemsMatchApprovedSource(
        [
          {
            materialId: '507f1f77bcf86cd799439011',
            quantity: 40,
            unit: MaterialUnit.Bag,
            rate: 380,
          },
        ],
        SOURCE,
      ).ok,
    ).toBe(true);
  });

  it('rejects rate that diverges from approved quotation', () => {
    const result = assertItemsMatchApprovedSource(
      [
        {
          materialId: '507f1f77bcf86cd799439011',
          quantity: 40,
          unit: MaterialUnit.Bag,
          rate: 400,
        },
      ],
      SOURCE,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Rate/);
    }
  });

  it('rejects quantity above approved quotation', () => {
    const result = assertItemsMatchApprovedSource(
      [
        {
          materialId: '507f1f77bcf86cd799439011',
          quantity: 101,
          unit: MaterialUnit.Bag,
          rate: 380,
        },
      ],
      SOURCE,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/cannot exceed/);
    }
  });
});

describe('purchaseOrderFormSchema', () => {
  const base = {
    projectId: '507f1f77bcf86cd799439011',
    purchaseRequestId: '507f1f77bcf86cd799439012',
    selectedQuotationId: '507f1f77bcf86cd799439013',
    vendorId: '507f1f77bcf86cd799439014',
    orderDate: '2026-07-17',
    expectedDeliveryDate: '2026-08-01',
    billingAddress: {
      line1: 'Site office',
      line2: null,
      city: 'Chennai',
      state: 'TN',
      pincode: '600001',
      country: 'India',
    },
    deliveryAddress: {
      line1: 'Gate 2',
      line2: null,
      city: 'Chennai',
      state: 'TN',
      pincode: '600002',
      country: 'India',
    },
    paymentTerms: 'Net 30',
    terms: null,
    taxes: 100,
    freight: 50,
    discount: 0,
    items: [
      {
        materialId: '507f1f77bcf86cd799439011',
        materialCode: 'CEM-01',
        materialName: 'Cement',
        quantity: 10,
        unit: MaterialUnit.Bag,
        rate: 380,
        tax: 68.4,
        discount: 0,
      },
    ],
  };

  it('accepts a valid draft PO', () => {
    expect(purchaseOrderFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects delivery before order date', () => {
    const parsed = purchaseOrderFormSchema.safeParse({
      ...base,
      expectedDeliveryDate: '2026-07-01',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects negative tax', () => {
    const parsed = purchaseOrderFormSchema.safeParse({
      ...base,
      taxes: -1,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('buildPurchaseOrderCreatePath', () => {
  it('builds sourcing deep link', () => {
    expect(
      buildPurchaseOrderCreatePath({
        purchaseRequestId: 'pr1',
        selectedQuotationId: 'q1',
      }),
    ).toBe(
      '/procurement/purchase-orders/new?purchaseRequestId=pr1&selectedQuotationId=q1',
    );
  });
});
