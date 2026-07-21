import { z } from 'zod';
import { isoDateOnlySchema, roundMoney } from '@/validation';
import {
  MaterialUnit,
  PurchaseRequestPriority,
  type ApprovePurchaseRequestInput,
  type ApprovePurchaseRequestItemInput,
  type CreatePurchaseRequestInput,
  type MaterialUnit as MaterialUnitType,
  type PublicPurchaseRequestItem,
  type UpdatePurchaseRequestInput,
} from './types';

const MATERIAL_UNIT_VALUES = Object.values(MaterialUnit) as [
  MaterialUnitType,
  ...MaterialUnitType[],
];

const PRIORITY_VALUES = Object.values(PurchaseRequestPriority) as [
  string,
  ...string[],
];

export const purchaseRequestItemFormSchema = z.object({
  materialId: z.string().trim().min(1, 'Material is required'),
  requestedQuantity: z.coerce
    .number({
      required_error: 'Quantity is required',
      invalid_type_error: 'Quantity must be a number',
    })
    .finite('Quantity must be a finite number')
    .gt(0, 'Quantity must be greater than zero'),
  unit: z.enum(MATERIAL_UNIT_VALUES, {
    required_error: 'Unit is required',
  }),
  estimatedRate: z
    .number({ invalid_type_error: 'Estimated rate must be a number' })
    .finite()
    .min(0, 'Estimated rate must be ≥ 0')
    .nullable()
    .optional(),
  boqItemId: z.string().trim().min(1).nullable().optional(),
  remarks: z
    .string()
    .trim()
    .max(500, 'Remarks are too long')
    .nullable()
    .optional(),
});

export const purchaseRequestFormSchema = z.object({
  projectId: z.string().trim().min(1, 'Project is required'),
  siteId: z.string().trim().min(1).nullable().optional(),
  warehouseSiteId: z.string().trim().min(1).nullable().optional(),
  requiredByDate: isoDateOnlySchema,
  priority: z.enum(PRIORITY_VALUES, {
    required_error: 'Priority is required',
  }),
  justification: z
    .string()
    .trim()
    .min(1, 'Justification is required')
    .max(2000, 'Justification is too long'),
  items: z
    .array(purchaseRequestItemFormSchema)
    .min(1, 'At least one item is required'),
});

export type PurchaseRequestFormValues = z.infer<
  typeof purchaseRequestFormSchema
>;
export type PurchaseRequestItemFormValues = z.infer<
  typeof purchaseRequestItemFormSchema
>;

export function emptyPurchaseRequestItem(): PurchaseRequestItemFormValues {
  return {
    materialId: '',
    requestedQuantity: 0,
    unit: MaterialUnit.Number,
    estimatedRate: null,
    boqItemId: null,
    remarks: null,
  };
}

export function defaultPurchaseRequestValues(
  partial?: Partial<PurchaseRequestFormValues>,
): PurchaseRequestFormValues {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 7);
  const requiredByDate = tomorrow.toISOString().slice(0, 10);

  return {
    projectId: '',
    siteId: null,
    warehouseSiteId: null,
    requiredByDate,
    priority: PurchaseRequestPriority.Normal,
    justification: '',
    items: [emptyPurchaseRequestItem()],
    ...partial,
  };
}

export function shapeCreatePayload(
  values: PurchaseRequestFormValues,
): CreatePurchaseRequestInput {
  return {
    projectId: values.projectId,
    siteId: values.siteId?.trim() || null,
    warehouseSiteId: values.warehouseSiteId?.trim() || null,
    requiredByDate: values.requiredByDate,
    priority: values.priority as CreatePurchaseRequestInput['priority'],
    justification: values.justification.trim(),
    items: values.items.map((item) => ({
      materialId: item.materialId,
      requestedQuantity: item.requestedQuantity,
      unit: item.unit,
      estimatedRate:
        item.estimatedRate == null
          ? null
          : roundMoney(item.estimatedRate),
      boqItemId: item.boqItemId ?? null,
      remarks: item.remarks?.trim() || null,
    })),
  };
}

export function shapeUpdatePayload(
  values: PurchaseRequestFormValues,
): UpdatePurchaseRequestInput {
  return shapeCreatePayload(values);
}

/** Allowed units for a material (base + alternates). */
export function allowedUnitsForMaterial(material: {
  baseUnit: MaterialUnitType;
  alternateUnits?: MaterialUnitType[] | null;
}): MaterialUnitType[] {
  return [
    material.baseUnit,
    ...new Set(material.alternateUnits ?? []),
  ];
}

/* ── Partial approval helpers (Phase 062 dialog) ───────────────────── */

export const APPROVED_QTY_EXCEEDS_MESSAGE =
  'approvedQuantity cannot exceed requestedQuantity';

export const APPROVE_NEEDS_LINE_MESSAGE =
  'At least one line must have approvedQuantity > 0';

export type ApproveLineFormRow = ApprovePurchaseRequestItemInput;

export type ApprovePurchaseRequestFormValues = {
  items: ApproveLineFormRow[];
  notes?: string;
};

export function defaultApproveFormValues(
  items: readonly Pick<PublicPurchaseRequestItem, 'id' | 'requestedQuantity'>[],
): ApprovePurchaseRequestFormValues {
  return {
    items: items.map((item) => ({
      lineId: item.id,
      approvedQuantity: item.requestedQuantity,
    })),
    notes: '',
  };
}

/** Nest `assertApprovedQuantity` mirror (throws). */
export function assertApprovedQuantity(
  approvedQuantity: number,
  requestedQuantity: number,
): void {
  if (!Number.isFinite(approvedQuantity) || approvedQuantity < 0) {
    throw new Error('approvedQuantity must be a number ≥ 0');
  }
  if (approvedQuantity - requestedQuantity > 1e-9) {
    throw new Error(APPROVED_QTY_EXCEEDS_MESSAGE);
  }
}

export function isApprovedQuantityValid(
  approvedQuantity: number,
  requestedQuantity: number,
): boolean {
  try {
    assertApprovedQuantity(approvedQuantity, requestedQuantity);
    return true;
  } catch {
    return false;
  }
}

export function validateApprovePayload(
  lines: readonly Pick<
    PublicPurchaseRequestItem,
    'id' | 'requestedQuantity'
  >[],
  decisions: readonly ApproveLineFormRow[],
): {
  ok: boolean;
  payload: ApprovePurchaseRequestInput | null;
  lineErrors: Record<string, string>;
  formError: string | null;
} {
  const lineErrors: Record<string, string> = {};
  const byId = new Map(lines.map((l) => [l.id, l]));
  const items: ApprovePurchaseRequestItemInput[] = [];

  for (const decision of decisions) {
    const line = byId.get(decision.lineId);
    if (!line) {
      lineErrors[decision.lineId] = 'Unknown line';
      continue;
    }
    if (!isApprovedQuantityValid(decision.approvedQuantity, line.requestedQuantity)) {
      lineErrors[decision.lineId] = APPROVED_QTY_EXCEEDS_MESSAGE;
      continue;
    }
    items.push({
      lineId: decision.lineId,
      approvedQuantity: decision.approvedQuantity,
    });
  }

  if (Object.keys(lineErrors).length > 0) {
    return { ok: false, payload: null, lineErrors, formError: null };
  }

  if (!items.some((i) => i.approvedQuantity > 0)) {
    return {
      ok: false,
      payload: null,
      lineErrors,
      formError: APPROVE_NEEDS_LINE_MESSAGE,
    };
  }

  return {
    ok: true,
    payload: { items },
    lineErrors,
    formError: null,
  };
}
