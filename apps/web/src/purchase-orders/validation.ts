import { z } from 'zod';
import type { PublicVendorQuotation } from '@/quotations/types';
import { isoDateOnlySchema, roundMoney } from '@/validation';
import { computeLineTotal } from './totals';
import {
  MaterialUnit,
  type ApprovedSourceLine,
  type CreatePurchaseOrderInput,
  type MaterialUnit as MaterialUnitType,
  type UpdatePurchaseOrderInput,
} from './types';

const MONEY_EPS = 0.005;
const QTY_EPS = 1e-6;

const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

const UNIT_VALUES = Object.values(MaterialUnit) as [
  MaterialUnitType,
  ...MaterialUnitType[],
];

const emptyToNull = z.union([z.string(), z.null()]).transform((v) => {
  if (v == null) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
});

export const poAddressFormSchema = z.object({
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  line2: emptyToNull,
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  pincode: z.string().trim().min(1, 'Pincode is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(100),
});

export const poItemFormSchema = z.object({
  materialId: mongoIdSchema,
  materialCode: z.string().nullable().optional(),
  materialName: z.string().nullable().optional(),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity is required' })
    .finite()
    .gt(0, 'Quantity must be greater than zero'),
  unit: z.enum(UNIT_VALUES, { required_error: 'Unit is required' }),
  rate: z.coerce
    .number({ invalid_type_error: 'Rate is required' })
    .finite()
    .min(0, 'Rate cannot be negative'),
  tax: z.coerce
    .number({ invalid_type_error: 'Tax must be a number' })
    .finite()
    .min(0, 'Tax cannot be negative'),
  discount: z.coerce
    .number({ invalid_type_error: 'Discount must be a number' })
    .finite()
    .min(0, 'Discount cannot be negative'),
});

export const purchaseOrderFormSchema = z
  .object({
    projectId: mongoIdSchema,
    purchaseRequestId: mongoIdSchema,
    selectedQuotationId: mongoIdSchema,
    vendorId: mongoIdSchema,
    orderDate: isoDateOnlySchema,
    expectedDeliveryDate: isoDateOnlySchema,
    billingAddress: poAddressFormSchema,
    deliveryAddress: poAddressFormSchema,
    paymentTerms: emptyToNull,
    terms: emptyToNull,
    taxes: z.coerce
      .number()
      .finite()
      .min(0, 'Header tax cannot be negative'),
    freight: z.coerce
      .number()
      .finite()
      .min(0, 'Freight cannot be negative'),
    discount: z.coerce
      .number()
      .finite()
      .min(0, 'Header discount cannot be negative'),
    items: z.array(poItemFormSchema).min(1, 'At least one item is required'),
  })
  .superRefine((values, ctx) => {
    if (values.expectedDeliveryDate < values.orderDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expectedDeliveryDate'],
        message: 'Expected delivery cannot be earlier than order date',
      });
    }

    values.items.forEach((item, index) => {
      const base = item.quantity * item.rate;
      if (item.discount - base > MONEY_EPS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'discount'],
          message: 'Line discount cannot exceed quantity × rate',
        });
      }
    });
  });

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;
export type PoItemFormValues = z.infer<typeof poItemFormSchema>;
export type PoAddressFormValues = z.infer<typeof poAddressFormSchema>;

export function emptyPoAddress(
  partial?: Partial<PoAddressFormValues>,
): PoAddressFormValues {
  return {
    line1: '',
    line2: null,
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    ...partial,
  };
}

export function emptyPoItem(
  partial?: Partial<PoItemFormValues>,
): PoItemFormValues {
  return {
    materialId: '',
    materialCode: null,
    materialName: null,
    quantity: 1,
    unit: MaterialUnit.Number,
    rate: 0,
    tax: 0,
    discount: 0,
    ...partial,
  };
}

export function defaultPurchaseOrderFormValues(
  partial?: Partial<PurchaseOrderFormValues>,
): PurchaseOrderFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    projectId: '',
    purchaseRequestId: '',
    selectedQuotationId: '',
    vendorId: '',
    orderDate: today,
    expectedDeliveryDate: today,
    billingAddress: emptyPoAddress(),
    deliveryAddress: emptyPoAddress(),
    paymentTerms: null,
    terms: null,
    taxes: 0,
    freight: 0,
    discount: 0,
    items: [emptyPoItem()],
    ...partial,
  };
}

/** Add calendar days to a YYYY-MM-DD string (UTC). */
export function addDaysIso(dateOnly: string, days: number): string {
  const d = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dateOnly;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function quotationToSourceLines(
  quotation: Pick<PublicVendorQuotation, 'items'>,
): ApprovedSourceLine[] {
  return quotation.items.map((item) => ({
    materialId: item.materialId,
    materialCode: item.materialCode,
    materialName: item.materialName,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    tax: item.tax,
    discount: item.discount,
  }));
}

export function formValuesFromQuotation(
  quotation: PublicVendorQuotation,
  partial?: Partial<PurchaseOrderFormValues>,
): PurchaseOrderFormValues {
  const orderDate = new Date().toISOString().slice(0, 10);
  const expectedDeliveryDate = addDaysIso(
    orderDate,
    Math.max(0, quotation.deliveryDays || 0),
  );
  return defaultPurchaseOrderFormValues({
    projectId: quotation.projectId,
    purchaseRequestId: quotation.purchaseRequestId,
    selectedQuotationId: quotation.id,
    vendorId: quotation.vendorId,
    orderDate,
    expectedDeliveryDate,
    paymentTerms: quotation.paymentTerms,
    taxes: quotation.taxes,
    freight: quotation.freight,
    discount: quotation.discount,
    items: quotation.items.map((item) =>
      emptyPoItem({
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        quantity: item.quantity,
        unit: item.unit as MaterialUnitType,
        rate: item.rate,
        tax: item.tax,
        discount: item.discount,
      }),
    ),
    ...partial,
  });
}

/**
 * Client preview: rates/units must match approved quotation; qty ≤ source qty.
 * Nest remains authoritative on create (defaults items from quotation when omitted).
 */
export function assertItemsMatchApprovedSource(
  items: ReadonlyArray<{
    materialId: string;
    quantity: number;
    unit: string;
    rate: number;
  }>,
  sourceLines: readonly ApprovedSourceLine[],
): { ok: true } | { ok: false; message: string } {
  if (sourceLines.length === 0) {
    return { ok: false, message: 'Approved quotation has no line items.' };
  }
  if (items.length === 0) {
    return { ok: false, message: 'At least one item is required.' };
  }

  const byMaterial = new Map(
    sourceLines.map((line) => [line.materialId, line]),
  );

  for (const item of items) {
    const source = byMaterial.get(item.materialId);
    if (!source) {
      return {
        ok: false,
        message: `Material ${item.materialId} is not on the approved quotation.`,
      };
    }
    if (item.unit !== source.unit) {
      return {
        ok: false,
        message: `Unit for ${source.materialCode ?? source.materialName ?? 'item'} must match the approved quotation (${source.unit}).`,
      };
    }
    if (Math.abs(roundMoney(item.rate) - roundMoney(source.rate)) >= MONEY_EPS) {
      return {
        ok: false,
        message: `Rate for ${source.materialCode ?? source.materialName ?? 'item'} must match the approved quotation (${source.rate}).`,
      };
    }
    if (item.quantity - source.quantity > QTY_EPS) {
      return {
        ok: false,
        message: `Quantity for ${source.materialCode ?? source.materialName ?? 'item'} cannot exceed approved quotation qty (${source.quantity}).`,
      };
    }
    if (!(item.quantity > 0)) {
      return {
        ok: false,
        message: `Quantity for ${source.materialCode ?? source.materialName ?? 'item'} must be greater than zero.`,
      };
    }
  }

  return { ok: true };
}

export function assertOrderDeliveryDates(
  orderDate: string,
  expectedDeliveryDate: string,
): { ok: true } | { ok: false; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
    return { ok: false, message: 'Order date must be YYYY-MM-DD.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDeliveryDate)) {
    return { ok: false, message: 'Expected delivery must be YYYY-MM-DD.' };
  }
  if (expectedDeliveryDate < orderDate) {
    return {
      ok: false,
      message: 'Expected delivery cannot be earlier than order date.',
    };
  }
  return { ok: true };
}

function shapeAddress(address: PoAddressFormValues) {
  return {
    line1: address.line1.trim(),
    line2: address.line2,
    city: address.city.trim(),
    state: address.state.trim(),
    pincode: address.pincode.trim(),
    country: address.country.trim() || 'India',
  };
}

/** Map form → Nest `CreatePurchaseOrderDto`. */
export function shapeCreatePayload(
  values: PurchaseOrderFormValues,
): CreatePurchaseOrderInput {
  return {
    projectId: values.projectId,
    purchaseRequestId: values.purchaseRequestId,
    selectedQuotationId: values.selectedQuotationId,
    vendorId: values.vendorId,
    orderDate: values.orderDate,
    expectedDeliveryDate: values.expectedDeliveryDate,
    billingAddress: shapeAddress(values.billingAddress),
    deliveryAddress: shapeAddress(values.deliveryAddress),
    paymentTerms: values.paymentTerms,
    terms: values.terms,
    taxes: values.taxes,
    freight: values.freight,
    discount: values.discount,
    items: values.items.map((item) => ({
      materialId: item.materialId,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      tax: item.tax,
      discount: item.discount,
    })),
  };
}

/** Map form → Nest `UpdatePurchaseOrderDto` (draft edit). */
export function shapeUpdatePayload(
  values: PurchaseOrderFormValues,
): UpdatePurchaseOrderInput {
  const created = shapeCreatePayload(values);
  const {
    projectId: _p,
    purchaseRequestId: _pr,
    selectedQuotationId: _q,
    vendorId: _v,
    ...rest
  } = created;
  return rest;
}

export function linePreviewTotal(item: {
  quantity: number;
  rate: number;
  tax?: number;
  discount?: number;
}): number {
  return computeLineTotal(item);
}

/** Deep-link builder for sourcing / PO list → create form. */
export function buildPurchaseOrderCreatePath(args?: {
  purchaseRequestId?: string;
  selectedQuotationId?: string;
}): string {
  const params = new URLSearchParams();
  if (args?.purchaseRequestId) {
    params.set('purchaseRequestId', args.purchaseRequestId);
  }
  if (args?.selectedQuotationId) {
    params.set('selectedQuotationId', args.selectedQuotationId);
  }
  const qs = params.toString();
  return qs
    ? `/procurement/purchase-orders/new?${qs}`
    : '/procurement/purchase-orders/new';
}
