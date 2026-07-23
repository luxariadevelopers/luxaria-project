import { z } from 'zod';
import type {
  CreateMeasurementBookInput,
  ReviseMeasurementBookInput,
} from './api';

export const measurementBookFormSchema = z
  .object({
    contractorId: z.string().min(1, 'Contractor is required'),
    boqItemId: z.string().min(1, 'BOQ item is required'),
    locationLabel: z.string().max(240).optional().nullable(),
    length: z.coerce.number().min(0).optional().nullable(),
    breadth: z.coerce.number().min(0).optional().nullable(),
    height: z.coerce.number().min(0).optional().nullable(),
    numberOfUnits: z.coerce.number().min(0),
    quantity: z.coerce.number().min(0).optional().nullable(),
    periodFrom: z.string().min(1, 'Period from is required'),
    periodTo: z.string().min(1, 'Period to is required'),
    measurementDate: z.string().min(1, 'Measurement date is required'),
    workDescription: z.string().max(2000).optional().nullable(),
    sheetReference: z.string().max(120).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    submitOnSave: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (
      values.periodFrom &&
      values.periodTo &&
      values.periodTo < values.periodFrom
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Period to must be on or after period from',
        path: ['periodTo'],
      });
    }
    const hasDims =
      values.length != null ||
      values.breadth != null ||
      values.height != null;
    if (!hasDims && (values.quantity == null || values.quantity <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide L/B/H dimensions or an explicit quantity',
        path: ['quantity'],
      });
    }
  });

export type MeasurementBookFormValues = z.infer<
  typeof measurementBookFormSchema
>;

export function defaultMeasurementBookFormValues(): MeasurementBookFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    contractorId: '',
    boqItemId: '',
    locationLabel: '',
    length: null,
    breadth: null,
    height: null,
    numberOfUnits: 1,
    quantity: null,
    periodFrom: today,
    periodTo: today,
    measurementDate: today,
    workDescription: '',
    sheetReference: '',
    notes: '',
    submitOnSave: false,
  };
}

export function formValuesToCreateInput(
  values: MeasurementBookFormValues,
  projectId: string,
): CreateMeasurementBookInput {
  const emptyToNull = (v: string | null | undefined) => {
    const t = (v ?? '').trim();
    return t ? t : null;
  };
  return {
    projectId,
    contractorId: values.contractorId,
    boqItemId: values.boqItemId,
    location: {
      locationLabel: emptyToNull(values.locationLabel),
    },
    length: values.length ?? null,
    breadth: values.breadth ?? null,
    height: values.height ?? null,
    numberOfUnits: values.numberOfUnits ?? 1,
    quantity: values.quantity ?? null,
    periodFrom: values.periodFrom,
    periodTo: values.periodTo,
    measurementDate: values.measurementDate,
    workDescription: emptyToNull(values.workDescription),
    sheetReference: emptyToNull(values.sheetReference),
    notes: emptyToNull(values.notes),
  };
}

export const rejectMbSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(2000),
});

export type RejectMbFormValues = z.infer<typeof rejectMbSchema>;

export const reviseMbSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(1000),
  length: z.coerce.number().min(0).optional().nullable(),
  breadth: z.coerce.number().min(0).optional().nullable(),
  height: z.coerce.number().min(0).optional().nullable(),
  numberOfUnits: z.coerce.number().min(0).optional().nullable(),
  quantity: z.coerce.number().min(0).optional().nullable(),
  workDescription: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type ReviseMbFormValues = z.infer<typeof reviseMbSchema>;

export function formValuesToReviseInput(
  values: ReviseMbFormValues,
): ReviseMeasurementBookInput {
  const emptyToNull = (v: string | null | undefined) => {
    const t = (v ?? '').trim();
    return t ? t : null;
  };
  return {
    reason: values.reason.trim(),
    length: values.length ?? null,
    breadth: values.breadth ?? null,
    height: values.height ?? null,
    numberOfUnits: values.numberOfUnits ?? undefined,
    quantity: values.quantity ?? null,
    workDescription: emptyToNull(values.workDescription),
    notes: emptyToNull(values.notes),
  };
}
