import { z } from 'zod';
import { moneyNonNegativeSchema } from '@/validation';
import {
  assertBoqDateRange,
  computePlannedRate,
  computePlannedValue,
  validateBoqItemTotals,
} from './calculations';
import { BoqItemStatus, BoqUnit, BoqVersionType } from './types';

const optionalIsoDate = z
  .union([z.string().min(1), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

export const boqItemFormSchema = z
  .object({
    versionId: z.string().optional(),
    blockId: z.string().min(1, 'Block is required'),
    floorId: z.string().min(1, 'Floor is required'),
    workCategoryId: z.string().min(1, 'Work category is required'),
    boqCode: z.string().optional(),
    description: z.string().min(1, 'Description is required').max(500),
    unit: z.enum([
      BoqUnit.Number,
      BoqUnit.Bag,
      BoqUnit.Kilogram,
      BoqUnit.Ton,
      BoqUnit.Litre,
      BoqUnit.Metre,
      BoqUnit.SquareFoot,
      BoqUnit.CubicFoot,
      BoqUnit.SquareMetre,
      BoqUnit.CubicMetre,
      BoqUnit.RunningMetre,
      BoqUnit.Load,
      BoqUnit.Box,
      BoqUnit.Job,
      BoqUnit.Day,
      BoqUnit.LumpSum,
    ]),
    plannedQuantity: z.coerce.number().min(0, 'Quantity must be ≥ 0'),
    materialCost: moneyNonNegativeSchema,
    labourCost: moneyNonNegativeSchema,
    subcontractCost: moneyNonNegativeSchema,
    otherCost: moneyNonNegativeSchema,
    plannedRate: moneyNonNegativeSchema,
    plannedValue: moneyNonNegativeSchema,
    startDate: optionalIsoDate,
    endDate: optionalIsoDate,
    status: z.enum([
      BoqItemStatus.Draft,
      BoqItemStatus.Active,
      BoqItemStatus.OnHold,
      BoqItemStatus.Completed,
      BoqItemStatus.Cancelled,
    ]),
    notes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((values, ctx) => {
    const totals = validateBoqItemTotals({
      materialCost: values.materialCost,
      labourCost: values.labourCost,
      subcontractCost: values.subcontractCost,
      otherCost: values.otherCost,
      plannedQuantity: values.plannedQuantity,
      plannedRate: values.plannedRate,
      plannedValue: values.plannedValue,
    });
    if (!totals.valid) {
      for (const message of totals.errors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: message.includes('plannedValue')
            ? ['plannedValue']
            : message.includes('plannedRate')
              ? ['plannedRate']
              : ['plannedQuantity'],
        });
      }
    }

    const dates = assertBoqDateRange(values.startDate, values.endDate);
    if (!dates.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: dates.message,
        path: ['endDate'],
      });
    }
  });

export type BoqItemFormValues = z.infer<typeof boqItemFormSchema>;

export function defaultBoqItemFormValues(): BoqItemFormValues {
  return {
    versionId: '',
    blockId: '',
    floorId: '',
    workCategoryId: '',
    boqCode: '',
    description: '',
    unit: BoqUnit.CubicMetre,
    plannedQuantity: 0,
    materialCost: 0,
    labourCost: 0,
    subcontractCost: 0,
    otherCost: 0,
    plannedRate: 0,
    plannedValue: 0,
    startDate: null,
    endDate: null,
    status: BoqItemStatus.Draft,
    notes: '',
  };
}

/** Recompute rate/value from cost components + quantity (UI helper). */
export function syncBoqItemDerivedTotals(
  values: Pick<
    BoqItemFormValues,
    | 'materialCost'
    | 'labourCost'
    | 'subcontractCost'
    | 'otherCost'
    | 'plannedQuantity'
  >,
): { plannedRate: number; plannedValue: number } {
  const plannedRate = computePlannedRate(values);
  return {
    plannedRate,
    plannedValue: computePlannedValue(values.plannedQuantity, plannedRate),
  };
}

export function shapeBoqItemCreatePayload(
  values: BoqItemFormValues,
): {
  versionId?: string;
  workCategoryId: string;
  boqCode?: string;
  description: string;
  unit: BoqUnit;
  plannedQuantity: number;
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
  plannedRate: number;
  plannedValue: number;
  startDate: string | null;
  endDate: string | null;
  status: BoqItemStatus;
  notes: string | null;
} {
  const derived = syncBoqItemDerivedTotals(values);
  return {
    versionId: values.versionId?.trim() || undefined,
    workCategoryId: values.workCategoryId,
    boqCode: values.boqCode?.trim() || undefined,
    description: values.description.trim(),
    unit: values.unit,
    plannedQuantity: values.plannedQuantity,
    materialCost: values.materialCost,
    labourCost: values.labourCost,
    subcontractCost: values.subcontractCost,
    otherCost: values.otherCost,
    plannedRate: derived.plannedRate,
    plannedValue: derived.plannedValue,
    startDate: values.startDate ?? null,
    endDate: values.endDate ?? null,
    status: values.status,
    notes: values.notes?.trim() ? values.notes.trim() : null,
  };
}

export function shapeBoqItemUpdatePayload(
  values: BoqItemFormValues,
): {
  description: string;
  unit: BoqUnit;
  plannedQuantity: number;
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
  plannedRate: number;
  plannedValue: number;
  startDate: string | null;
  endDate: string | null;
  status: BoqItemStatus;
  notes: string | null;
} {
  const created = shapeBoqItemCreatePayload(values);
  return {
    description: created.description,
    unit: created.unit,
    plannedQuantity: created.plannedQuantity,
    materialCost: created.materialCost,
    labourCost: created.labourCost,
    subcontractCost: created.subcontractCost,
    otherCost: created.otherCost,
    plannedRate: created.plannedRate,
    plannedValue: created.plannedValue,
    startDate: created.startDate,
    endDate: created.endDate,
    status: created.status,
    notes: created.notes,
  };
}

export const createBoqVersionSchema = z
  .object({
    versionType: z.enum([
      BoqVersionType.Original,
      BoqVersionType.Revision,
      BoqVersionType.Variation,
      BoqVersionType.ChangeOrder,
    ]),
    effectiveDate: z.string().min(1, 'Effective date is required'),
    reason: z.string().min(1, 'Reason is required').max(2000),
    basedOnVersionId: z.string().optional(),
    costImpact: z.coerce.number().optional(),
    timeImpact: z.coerce.number().optional(),
  })
  .superRefine((values, ctx) => {
    if (
      values.versionType !== BoqVersionType.Original &&
      !values.basedOnVersionId?.trim()
    ) {
      // Nest defaults to active version — warn only when none selected and
      // caller did not pass one; allow empty for server default.
      void ctx;
    }
  });

export type CreateBoqVersionFormValues = z.infer<typeof createBoqVersionSchema>;

export const approveBoqVersionSchema = z.object({
  approvalReference: z
    .string()
    .min(1, 'Approval reference is required')
    .max(120),
  comment: z.string().max(2000).optional().nullable(),
});

export type ApproveBoqVersionFormValues = z.infer<
  typeof approveBoqVersionSchema
>;

export const rejectBoqVersionSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(2000),
});

export type RejectBoqVersionFormValues = z.infer<typeof rejectBoqVersionSchema>;
