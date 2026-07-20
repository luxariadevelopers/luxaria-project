import { describe, expect, it } from 'vitest';
import {
  assertQuotationDates,
  assertSelectedPrItems,
  buildFormItemsFromPr,
  isQuotablePrLine,
  quotationFormSchema,
  shapeQuotationPayload,
} from './validation';
import type { PurchaseRequestLineForQuote } from './types';

const prItems: PurchaseRequestLineForQuote[] = [
  {
    id: 'l1',
    materialId: 'm1',
    materialCode: 'CEM',
    materialName: 'Cement',
    requestedQuantity: 100,
    unit: 'bag',
    approvedQuantity: 80,
    lineStatus: 'approved',
    estimatedRate: 380,
  },
  {
    id: 'l2',
    materialId: 'm2',
    materialCode: 'SND',
    materialName: 'Sand',
    requestedQuantity: 50,
    unit: 'ton',
    approvedQuantity: null,
    lineStatus: 'rejected',
    estimatedRate: 200,
  },
];

describe('quotation validation', () => {
  it('rejects validity earlier than quotation date', () => {
    expect(assertQuotationDates('2026-08-01', '2026-07-01').ok).toBe(false);
    expect(assertQuotationDates('2026-07-01', '2026-08-01').ok).toBe(true);
  });

  it('requires selected materials to be non-rejected PR items', () => {
    expect(assertSelectedPrItems(['m1'], prItems).ok).toBe(true);
    expect(assertSelectedPrItems(['m2'], prItems).ok).toBe(false);
    expect(assertSelectedPrItems([], prItems).ok).toBe(false);
  });

  it('excludes rejected PR lines from quotable set', () => {
    expect(isQuotablePrLine(prItems[0]!)).toBe(true);
    expect(isQuotablePrLine(prItems[1]!)).toBe(false);
  });

  it('defaults form items from PR using approved quantity', () => {
    const items = buildFormItemsFromPr(prItems);
    expect(items).toHaveLength(1);
    expect(items[0]?.materialId).toBe('m1');
    expect(items[0]?.quantity).toBe(80);
    expect(items[0]?.rate).toBe(380);
    expect(items[0]?.selected).toBe(true);
  });

  it('accepts a valid form and shapes Nest create payload', () => {
    const values = {
      purchaseRequestId: 'pr1',
      vendorId: 'v1',
      quotationDate: '2026-07-17',
      validityDate: '2026-08-17',
      deliveryDays: 7,
      paymentTerms: 'Net 30',
      freight: 1500,
      taxes: 0,
      discount: 500,
      items: [
        {
          selected: true,
          materialId: 'm1',
          materialLabel: 'CEM — Cement',
          quantity: 80,
          unit: 'bag' as const,
          rate: 380,
          tax: 684,
          discount: 0,
        },
      ],
    };
    const parsed = quotationFormSchema.safeParse(values);
    expect(parsed.success).toBe(true);
    const payload = shapeQuotationPayload(values);
    expect(payload.items).toHaveLength(1);
    expect(payload.paymentTerms).toBe('Net 30');
    expect(payload.discount).toBe(500);
  });

  it('rejects form when no PR items selected or validity is early', () => {
    const parsed = quotationFormSchema.safeParse({
      purchaseRequestId: 'pr1',
      vendorId: 'v1',
      quotationDate: '2026-08-01',
      validityDate: '2026-07-01',
      deliveryDays: 0,
      paymentTerms: '',
      freight: 0,
      taxes: 0,
      discount: 0,
      items: [
        {
          selected: false,
          materialId: 'm1',
          materialLabel: 'CEM',
          quantity: 1,
          unit: 'bag',
          rate: 10,
          tax: 0,
          discount: 0,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
