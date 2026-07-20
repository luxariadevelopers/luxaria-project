import { z } from 'zod';
import { isoDateOnlySchema } from '@/validation';
import {
  computeExpectedTotalAmount,
  computeLineAmount,
  roundMoney,
  roundQty,
} from './totals';
import type {
  InvoiceableGoodsReceipt,
  PublicVendorInvoice,
  VendorInvoiceItemInput,
} from './types';

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

const nonNegativeMoney = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .finite('Amount must be a finite number')
  .min(0, 'Amount must be ≥ 0');

/** Nest `normalizeInvoiceNumber` — trim + uppercase. */
export function normalizeInvoiceNumber(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Nest 409 — `Duplicate vendor invoice number … for this vendor`.
 */
export const DUPLICATE_VENDOR_INVOICE_MESSAGE =
  'Duplicate vendor invoice number for this vendor';

export function isDuplicateVendorInvoiceMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('duplicate vendor invoice number') ||
    lower.includes('duplicate invoice')
  );
}

/**
 * Soft client check against the current list (Nest remains authoritative).
 */
export function findDuplicateVendorInvoice(
  invoices: readonly PublicVendorInvoice[],
  vendorId: string,
  invoiceNumber: string,
  excludeInvoiceId?: string,
): PublicVendorInvoice | null {
  const normalized = normalizeInvoiceNumber(invoiceNumber);
  if (!normalized || !vendorId) return null;
  for (const row of invoices) {
    if (excludeInvoiceId && row.id === excludeInvoiceId) continue;
    if (row.vendorId !== vendorId) continue;
    if (normalizeInvoiceNumber(row.invoiceNumber) === normalized) {
      return row;
    }
  }
  return null;
}

/** Nest: dueDate cannot be before invoiceDate. */
export function assertInvoiceDates(
  invoiceDate: string,
  dueDate: string,
): { ok: true } | { ok: false; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
    return { ok: false, message: 'Invoice date must be YYYY-MM-DD.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { ok: false, message: 'Due date must be YYYY-MM-DD.' };
  }
  if (dueDate < invoiceDate) {
    return {
      ok: false,
      message: 'Due date cannot be earlier than invoice date.',
    };
  }
  return { ok: true };
}

/** Nest `assertHeaderTotals` client preview. */
export function assertHeaderTotals(input: {
  taxableValue: number;
  gst: number;
  freight: number;
  totalAmount: number;
  tds: number;
  retention: number;
}): { ok: true } | { ok: false; message: string } {
  const expected = computeExpectedTotalAmount(input);
  if (Math.abs(expected - roundMoney(input.totalAmount)) > 0.05) {
    return {
      ok: false,
      message: `Total amount (${input.totalAmount}) must equal taxable value + GST + freight (${expected}).`,
    };
  }
  if (input.tds + input.retention - input.totalAmount > 1e-9) {
    return {
      ok: false,
      message: 'TDS + retention cannot exceed total amount.',
    };
  }
  return { ok: true };
}

/**
 * Aggregate accepted qty by material from selected GRNs.
 * Nest uses acceptedQuantity on accepted / partially_accepted / posted GRNs.
 */
export function aggregateGrnAcceptedByMaterial(
  grns: readonly InvoiceableGoodsReceipt[],
  selectedGrnIds: readonly string[],
): Map<string, number> {
  const selected = new Set(selectedGrnIds);
  const map = new Map<string, number>();
  for (const grn of grns) {
    if (!selected.has(grn.id)) continue;
    for (const item of grn.items) {
      const accepted = item.acceptedQuantity ?? 0;
      if (accepted <= 0) continue;
      const key = item.materialId;
      map.set(key, roundQty((map.get(key) ?? 0) + accepted));
    }
  }
  return map;
}

/**
 * Client warning when invoice qty exceeds GRN accepted for a material.
 * Nest raises exception variance on match; create still allows the line.
 */
export function findGrnQuantityOverages(
  items: readonly VendorInvoiceItemInput[],
  acceptedByMaterial: Map<string, number>,
): Array<{ materialId: string; invoiced: number; accepted: number }> {
  const invoicedByMaterial = new Map<string, number>();
  for (const item of items) {
    invoicedByMaterial.set(
      item.materialId,
      roundQty((invoicedByMaterial.get(item.materialId) ?? 0) + item.quantity),
    );
  }
  const overages: Array<{
    materialId: string;
    invoiced: number;
    accepted: number;
  }> = [];
  for (const [materialId, invoiced] of invoicedByMaterial) {
    const accepted = acceptedByMaterial.get(materialId) ?? 0;
    if (invoiced - accepted > 1e-9) {
      overages.push({ materialId, invoiced, accepted });
    }
  }
  return overages;
}

export type InvoiceFormItemValues = {
  materialId: string;
  materialLabel: string;
  purchaseOrderLineId: string | null;
  quantity: number;
  unit: (typeof MATERIAL_UNITS)[number];
  rate: number;
  tax: number;
  grnAcceptedQuantity: number;
};

export type InvoiceFormValues = {
  invoiceNumber: string;
  vendorId: string;
  purchaseOrderId: string;
  grnIds: string[];
  invoiceDate: string;
  dueDate: string;
  taxableValue: number;
  gst: number;
  tds: number;
  retention: number;
  freight: number;
  discount: number;
  totalAmount: number;
  invoiceDocument: string;
  notes: string;
  items: InvoiceFormItemValues[];
};

export const invoiceFormSchema = z
  .object({
    invoiceNumber: z
      .string()
      .trim()
      .min(1, 'Vendor invoice number is required')
      .max(80),
    vendorId: z.string().min(1, 'Vendor is required'),
    purchaseOrderId: z.string().min(1, 'Purchase order is required'),
    grnIds: z.array(z.string()).min(1, 'Select at least one GRN'),
    invoiceDate: isoDateOnlySchema,
    dueDate: isoDateOnlySchema,
    taxableValue: nonNegativeMoney,
    gst: nonNegativeMoney,
    tds: nonNegativeMoney,
    retention: nonNegativeMoney,
    freight: nonNegativeMoney,
    discount: nonNegativeMoney,
    totalAmount: nonNegativeMoney,
    invoiceDocument: z.string().max(200),
    notes: z.string().max(2000),
    items: z
      .array(
        z.object({
          materialId: z.string().min(1),
          materialLabel: z.string(),
          purchaseOrderLineId: z.string().nullable(),
          quantity: z.coerce.number().min(0.000001, 'Quantity must be > 0'),
          unit: z.enum(MATERIAL_UNITS),
          rate: nonNegativeMoney,
          tax: nonNegativeMoney,
          grnAcceptedQuantity: z.coerce.number().min(0),
        }),
      )
      .min(1, 'At least one line item is required'),
  })
  .superRefine((values, ctx) => {
    const dates = assertInvoiceDates(values.invoiceDate, values.dueDate);
    if (!dates.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: dates.message,
        path: ['dueDate'],
      });
    }
    const totals = assertHeaderTotals({
      taxableValue: values.taxableValue,
      gst: values.gst,
      freight: values.freight,
      totalAmount: values.totalAmount,
      tds: values.tds,
      retention: values.retention,
    });
    if (!totals.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: totals.message,
        path: ['totalAmount'],
      });
    }
  });

export type InvoiceFormSchemaValues = z.infer<typeof invoiceFormSchema>;

export function toCreateInput(
  values: InvoiceFormSchemaValues,
  projectId: string,
): {
  invoiceNumber: string;
  vendorId: string;
  projectId: string;
  purchaseOrderId: string;
  grnIds: string[];
  invoiceDate: string;
  dueDate: string;
  taxableValue: number;
  gst: number;
  tds: number;
  retention: number;
  freight: number;
  discount: number;
  totalAmount: number;
  invoiceDocument: string | null;
  notes: string | null;
  items: VendorInvoiceItemInput[];
} {
  return {
    invoiceNumber: normalizeInvoiceNumber(values.invoiceNumber),
    vendorId: values.vendorId,
    projectId,
    purchaseOrderId: values.purchaseOrderId,
    grnIds: values.grnIds,
    invoiceDate: values.invoiceDate,
    dueDate: values.dueDate,
    taxableValue: roundMoney(values.taxableValue),
    gst: roundMoney(values.gst),
    tds: roundMoney(values.tds),
    retention: roundMoney(values.retention),
    freight: roundMoney(values.freight),
    discount: roundMoney(values.discount),
    totalAmount: roundMoney(values.totalAmount),
    invoiceDocument: values.invoiceDocument?.trim() || null,
    notes: values.notes?.trim() || null,
    items: values.items.map((item) => ({
      materialId: item.materialId,
      purchaseOrderLineId: item.purchaseOrderLineId,
      quantity: item.quantity,
      unit: item.unit,
      rate: roundMoney(item.rate),
      tax: roundMoney(item.tax),
    })),
  };
}

export function lineAmountPreview(item: {
  quantity: number;
  rate: number;
  tax: number;
}): number {
  return computeLineAmount(item);
}

export const exceptionApproveSchema = z.object({
  exceptionApprovalComment: z
    .string()
    .trim()
    .min(3, 'Exception approval comment is required')
    .max(1000),
});

export type ExceptionApproveFormValues = z.infer<typeof exceptionApproveSchema>;

export const rejectMatchingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Rejection reason is required')
    .max(1000),
});

export type RejectMatchingFormValues = z.infer<typeof rejectMatchingSchema>;
