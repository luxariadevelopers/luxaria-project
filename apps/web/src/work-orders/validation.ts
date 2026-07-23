import { z } from 'zod';
import { BoqUnit } from '@/boq/types';
import { moneyNonNegativeSchema } from '@/validation';
import type {
  CreateWorkOrderAmendmentInput,
  CreateWorkOrderInput,
  PublicWorkOrder,
  UpdateWorkOrderInput,
  WorkOrderResponsibility,
} from './types';

const boqUnitValues = Object.values(BoqUnit) as [BoqUnit, ...BoqUnit[]];
const responsibilityValues = ['company', 'contractor', 'shared'] as const;
const amendmentTypeValues = [
  'quantity',
  'rate',
  'scope',
  'time_extension',
  'revised_value',
  'mixed',
] as const;

export const workOrderBoqLineSchema = z.object({
  boqItemId: z.string().optional().nullable(),
  boqCode: z.string().max(40).optional().nullable(),
  description: z.string().min(1, 'Description is required').max(500),
  unit: z.enum(boqUnitValues),
  quantity: z.coerce.number().min(0, 'Quantity must be ≥ 0'),
  rate: moneyNonNegativeSchema,
});

export const workOrderFormSchema = z
  .object({
    contractorId: z.string().min(1, 'Contractor is required'),
    projectId: z.string().min(1, 'Project is required'),
    boqScopeLines: z
      .array(workOrderBoqLineSchema)
      .min(1, 'At least one BOQ line is required'),
    locations: z.string().max(2000).optional().nullable(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    materialResponsibility: z.enum(responsibilityValues),
    labourResponsibility: z.enum(responsibilityValues),
    terms: z.string().max(10000).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((values, ctx) => {
    if (
      values.startDate &&
      values.endDate &&
      values.endDate < values.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after start date',
        path: ['endDate'],
      });
    }
  });

export type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;

export function defaultWorkOrderFormValues(
  projectId: string,
): WorkOrderFormValues {
  return {
    contractorId: '',
    projectId,
    boqScopeLines: [
      {
        boqItemId: null,
        boqCode: '',
        description: '',
        unit: BoqUnit.Number,
        quantity: 0,
        rate: 0,
      },
    ],
    locations: '',
    startDate: '',
    endDate: '',
    materialResponsibility: 'company',
    labourResponsibility: 'contractor',
    terms: '',
    notes: '',
  };
}

export function workOrderToFormValues(
  row: PublicWorkOrder,
): WorkOrderFormValues {
  return {
    contractorId: row.contractorId,
    projectId: row.projectId,
    boqScopeLines:
      row.boqScopeLines.length > 0
        ? row.boqScopeLines.map((line) => ({
            boqItemId: line.boqItemId,
            boqCode: line.boqCode ?? '',
            description: line.description,
            unit: (Object.values(BoqUnit).includes(line.unit as BoqUnit)
              ? line.unit
              : BoqUnit.Number) as BoqUnit,
            quantity: line.quantity,
            rate: line.rate,
          }))
        : defaultWorkOrderFormValues(row.projectId).boqScopeLines,
    locations: row.locations.join(', '),
    startDate: row.startDate.slice(0, 10),
    endDate: row.endDate.slice(0, 10),
    materialResponsibility: row.materialResponsibility,
    labourResponsibility: row.labourResponsibility,
    terms: row.terms ?? '',
    notes: row.notes ?? '',
  };
}

function parseLocations(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formValuesToCreateInput(
  values: WorkOrderFormValues,
): CreateWorkOrderInput {
  return {
    projectId: values.projectId,
    contractorId: values.contractorId,
    boqScopeLines: values.boqScopeLines.map((line) => ({
      boqItemId: line.boqItemId || null,
      boqCode: line.boqCode?.trim() || null,
      description: line.description.trim(),
      unit: line.unit,
      quantity: line.quantity,
      rate: line.rate,
    })),
    locations: parseLocations(values.locations),
    startDate: values.startDate,
    endDate: values.endDate,
    materialResponsibility:
      values.materialResponsibility as WorkOrderResponsibility,
    labourResponsibility:
      values.labourResponsibility as WorkOrderResponsibility,
    terms: values.terms?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

export function formValuesToUpdateInput(
  values: WorkOrderFormValues,
): UpdateWorkOrderInput {
  const created = formValuesToCreateInput(values);
  const { projectId: _p, contractorId: _c, ...rest } = created;
  return rest;
}

export function summarizeBoqLines(
  lines: Array<{ quantity: number; rate: number }>,
): { quantity: number; value: number } {
  return lines.reduce(
    (acc, line) => ({
      quantity: acc.quantity + (Number(line.quantity) || 0),
      value: acc.value + (Number(line.quantity) || 0) * (Number(line.rate) || 0),
    }),
    { quantity: 0, value: 0 },
  );
}

export const amendWorkOrderSchema = z
  .object({
    type: z.enum(amendmentTypeValues),
    reason: z.string().min(1, 'Reason is required').max(2000),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    revisedValue: z.coerce.number().min(0).optional().nullable(),
    terms: z.string().max(10000).optional().nullable(),
    boqScopeLines: z.array(workOrderBoqLineSchema).optional(),
  })
  .superRefine((values, ctx) => {
    if (
      values.startDate &&
      values.endDate &&
      values.endDate < values.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after start date',
        path: ['endDate'],
      });
    }
    if (
      (values.type === 'quantity' ||
        values.type === 'rate' ||
        values.type === 'scope' ||
        values.type === 'mixed') &&
      (!values.boqScopeLines || values.boqScopeLines.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'BOQ lines are required for this amendment type',
        path: ['boqScopeLines'],
      });
    }
    if (values.type === 'revised_value' && values.revisedValue == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Revised value is required',
        path: ['revisedValue'],
      });
    }
    if (
      values.type === 'time_extension' &&
      (!values.startDate || !values.endDate)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start and end dates are required for time extension',
        path: ['endDate'],
      });
    }
  });

export type AmendWorkOrderFormValues = z.infer<typeof amendWorkOrderSchema>;

export function defaultAmendFormValues(
  row: PublicWorkOrder,
): AmendWorkOrderFormValues {
  return {
    type: 'revised_value',
    reason: '',
    startDate: row.startDate.slice(0, 10),
    endDate: row.endDate.slice(0, 10),
    revisedValue: row.contractValue,
    terms: row.terms ?? '',
    boqScopeLines: row.boqScopeLines.map((line) => ({
      boqItemId: line.boqItemId,
      boqCode: line.boqCode ?? '',
      description: line.description,
      unit: (Object.values(BoqUnit).includes(line.unit as BoqUnit)
        ? line.unit
        : BoqUnit.Number) as BoqUnit,
      quantity: line.quantity,
      rate: line.rate,
    })),
  };
}

export function formValuesToAmendmentInput(
  values: AmendWorkOrderFormValues,
): CreateWorkOrderAmendmentInput {
  const input: CreateWorkOrderAmendmentInput = {
    type: values.type,
    reason: values.reason.trim(),
    terms: values.terms?.trim() || null,
  };

  if (values.startDate) input.startDate = values.startDate;
  if (values.endDate) input.endDate = values.endDate;
  if (values.revisedValue != null) input.revisedValue = values.revisedValue;

  if (
    values.boqScopeLines &&
    (values.type === 'quantity' ||
      values.type === 'rate' ||
      values.type === 'scope' ||
      values.type === 'mixed')
  ) {
    input.boqScopeLines = values.boqScopeLines.map((line) => ({
      boqItemId: line.boqItemId || null,
      boqCode: line.boqCode?.trim() || null,
      description: line.description.trim(),
      unit: line.unit,
      quantity: line.quantity,
      rate: line.rate,
    }));
  }

  return input;
}

export const reasonOnlySchema = z.object({
  reason: z.string().max(2000).optional().nullable(),
});

export type ReasonOnlyFormValues = z.infer<typeof reasonOnlySchema>;
