import { z } from 'zod';
import { isoDateOnlySchema } from '@/validation';
import { computeLineTotal } from './totals';
import type {
  PurchaseRequestLineForQuote,
  VendorQuotationItemInput,
} from './types';

const nonNegativeMoney = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .finite('Amount must be a finite number')
  .min(0, 'Amount must be ≥ 0');

const MATERIAL_UNITS = [
  'number',
  'bag',
  'kilogram',
  'ton',
  'litre',
  'metre',
  'square_foot',
  'cubic_foot',
  'load',
  'box',
] as const;

export type QuotationFormItemValues = {
  selected: boolean;
  materialId: string;
  materialLabel: string;
  quantity: number;
  unit: (typeof MATERIAL_UNITS)[number];
  rate: number;
  tax: number;
  discount: number;
};

export type QuotationFormValues = {
  purchaseRequestId: string;
  vendorId: string;
  quotationDate: string;
  validityDate: string;
  deliveryDays: number;
  paymentTerms: string;
  freight: number;
  taxes: number;
  discount: number;
  items: QuotationFormItemValues[];
};

/** Nest `assertQuotationDates` — validity ≥ quotation date. */
export function assertQuotationDates(
  quotationDate: string,
  validityDate: string,
): { ok: true } | { ok: false; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(quotationDate)) {
    return { ok: false, message: 'Quotation date must be YYYY-MM-DD.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validityDate)) {
    return { ok: false, message: 'Validity date must be YYYY-MM-DD.' };
  }
  if (validityDate < quotationDate) {
    return {
      ok: false,
      message: 'Validity date cannot be earlier than quotation date.',
    };
  }
  return { ok: true };
}

/** Line discount cannot exceed quantity × rate (Nest). */
export function assertLineDiscount(
  quantity: number,
  rate: number,
  discount: number,
): { ok: true } | { ok: false; message: string } {
  const base = Number(quantity) * Number(rate);
  if (Number(discount) - base > 1e-9) {
    return {
      ok: false,
      message: 'Line discount cannot exceed quantity × rate.',
    };
  }
  return { ok: true };
}

/**
 * Selected materials must belong to the linked PR and not be rejected.
 */
export function assertSelectedPrItems(
  selectedMaterialIds: readonly string[],
  prItems: readonly PurchaseRequestLineForQuote[],
): { ok: true } | { ok: false; message: string } {
  if (selectedMaterialIds.length === 0) {
    return { ok: false, message: 'Select at least one purchase-request item.' };
  }
  const allowed = new Set(
    prItems
      .filter((item) => item.lineStatus !== 'rejected')
      .map((item) => item.materialId),
  );
  for (const materialId of selectedMaterialIds) {
    if (!allowed.has(materialId)) {
      return {
        ok: false,
        message:
          'Quotations may only include non-rejected items from the selected purchase request.',
      };
    }
  }
  return { ok: true };
}

export function isQuotablePrLine(
  item: Pick<PurchaseRequestLineForQuote, 'lineStatus'>,
): boolean {
  return item.lineStatus !== 'rejected';
}

export function defaultQuantityForPrLine(
  item: PurchaseRequestLineForQuote,
): number {
  if (item.approvedQuantity != null && item.approvedQuantity > 0) {
    return item.approvedQuantity;
  }
  return item.requestedQuantity;
}

export function buildFormItemsFromPr(
  prItems: readonly PurchaseRequestLineForQuote[],
  existing?: ReadonlyArray<{
    materialId: string;
    quantity: number;
    unit: string;
    rate: number;
    tax: number;
    discount: number;
  }>,
): QuotationFormItemValues[] {
  const byMaterial = new Map(
    (existing ?? []).map((item) => [item.materialId, item]),
  );
  return prItems.filter(isQuotablePrLine).map((line) => {
    const prior = byMaterial.get(line.materialId);
    return {
      selected: Boolean(prior) || existing == null,
      materialId: line.materialId,
      materialLabel:
        [line.materialCode, line.materialName].filter(Boolean).join(' — ') ||
        line.materialId,
      quantity: prior?.quantity ?? defaultQuantityForPrLine(line),
      unit: (prior?.unit ?? line.unit) as QuotationFormItemValues['unit'],
      rate: prior?.rate ?? line.estimatedRate ?? 0,
      tax: prior?.tax ?? 0,
      discount: prior?.discount ?? 0,
    };
  });
}

const quotationItemSchema = z
  .object({
    selected: z.boolean(),
    materialId: z.string().min(1),
    materialLabel: z.string(),
    quantity: z.coerce.number().positive('Quantity must be greater than zero'),
    unit: z.enum(MATERIAL_UNITS),
    rate: nonNegativeMoney,
    tax: nonNegativeMoney,
    discount: nonNegativeMoney,
  })
  .superRefine((item, ctx) => {
    if (!item.selected) return;
    const discountCheck = assertLineDiscount(
      item.quantity,
      item.rate,
      item.discount,
    );
    if (!discountCheck.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: discountCheck.message,
        path: ['discount'],
      });
    }
  });

export const quotationFormSchema = z
  .object({
    purchaseRequestId: z.string().min(1, 'Purchase request is required'),
    vendorId: z.string().min(1, 'Vendor is required'),
    quotationDate: isoDateOnlySchema,
    validityDate: isoDateOnlySchema,
    deliveryDays: z.coerce.number().int().min(0),
    paymentTerms: z.string().max(500),
    freight: nonNegativeMoney,
    taxes: nonNegativeMoney,
    discount: nonNegativeMoney,
    items: z.array(quotationItemSchema).min(1, 'At least one PR item is required'),
  })
  .superRefine((values, ctx) => {
    const dates = assertQuotationDates(
      values.quotationDate,
      values.validityDate,
    );
    if (!dates.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: dates.message,
        path: ['validityDate'],
      });
    }
    const selected = values.items.filter((item) => item.selected);
    if (selected.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one purchase-request item.',
        path: ['items'],
      });
    }
    const headerBase =
      selected.reduce(
        (sum, item) => sum + computeLineTotal(item),
        0,
      ) +
      Number(values.freight) +
      Number(values.taxes);
    if (Number(values.discount) - headerBase > 1e-9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Header discount cannot exceed items subtotal + freight + taxes.',
        path: ['discount'],
      });
    }
  });

export function defaultQuotationFormValues(
  overrides?: Partial<QuotationFormValues>,
): QuotationFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    purchaseRequestId: '',
    vendorId: '',
    quotationDate: today,
    validityDate: today,
    deliveryDays: 0,
    paymentTerms: '',
    freight: 0,
    taxes: 0,
    discount: 0,
    items: [],
    ...overrides,
  };
}

export function shapeQuotationPayload(
  values: QuotationFormValues,
): {
  purchaseRequestId: string;
  vendorId: string;
  quotationDate: string;
  validityDate: string;
  deliveryDays: number;
  paymentTerms: string | null;
  freight: number;
  taxes: number;
  discount: number;
  items: VendorQuotationItemInput[];
} {
  const items = values.items
    .filter((item) => item.selected)
    .map((item) => ({
      materialId: item.materialId,
      quantity: Number(item.quantity),
      unit: item.unit,
      rate: Number(item.rate),
      tax: Number(item.tax),
      discount: Number(item.discount),
    }));
  return {
    purchaseRequestId: values.purchaseRequestId,
    vendorId: values.vendorId,
    quotationDate: values.quotationDate,
    validityDate: values.validityDate,
    deliveryDays: Number(values.deliveryDays),
    paymentTerms: values.paymentTerms.trim() || null,
    freight: Number(values.freight),
    taxes: Number(values.taxes),
    discount: Number(values.discount),
    items,
  };
}
