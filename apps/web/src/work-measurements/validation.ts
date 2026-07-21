import { z } from 'zod';
import {
  WorkMeasurementStatus,
  type PublicWorkMeasurement,
  type WorkMeasurementFilterState,
} from './types';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONGO_OBJECT_ID = /^[a-fA-F0-9]{24}$/;

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export const workMeasurementFiltersSchema = z.object({
  status: z.string(),
  contractorId: z.string(),
  boqItemId: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
});

export function emptyWorkMeasurementFilters(): WorkMeasurementFilterState {
  return {
    status: '',
    contractorId: '',
    boqItemId: '',
    fromDate: '',
    toDate: '',
  };
}

export function parsePhotoDocumentIds(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
}

export const measurementFormSchema = z.object({
  projectId: z
    .string()
    .trim()
    .regex(MONGO_OBJECT_ID, 'projectId must be a valid ObjectId'),
  contractorId: z
    .string()
    .trim()
    .regex(MONGO_OBJECT_ID, 'Select a valid contractor'),
  boqItemId: z
    .string()
    .trim()
    .regex(MONGO_OBJECT_ID, 'Select a valid BOQ item'),
  location: z
    .string()
    .trim()
    .min(1, 'Location is required')
    .max(240, 'Location must be at most 240 characters'),
  measurementDate: z
    .string()
    .trim()
    .regex(DATE_ONLY, 'measurementDate must be YYYY-MM-DD'),
  currentQuantity: z
    .number()
    .finite('currentQuantity must be a number')
    .min(0, 'currentQuantity must be ≥ 0'),
  measuredBy: z
    .string()
    .trim()
    .regex(MONGO_OBJECT_ID, 'measuredBy must be a valid ObjectId')
    .optional()
    .or(z.literal('')),
  drawingReference: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  photoDocumentIdsRaw: z.string().trim().optional(),
  submitOnSave: z.boolean().optional(),
});

export type MeasurementFormValues = z.infer<typeof measurementFormSchema>;

export const rejectMeasurementSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Rejection reason is required')
    .max(1000, 'Reason must be at most 1000 characters'),
});

export type RejectMeasurementFormValues = z.infer<
  typeof rejectMeasurementSchema
>;

const COUNTING_STATUSES: WorkMeasurementStatus[] = [
  WorkMeasurementStatus.Submitted,
  WorkMeasurementStatus.Verified,
  WorkMeasurementStatus.Certified,
];

/** Sum prior submitted/verified/certified quantities (client mirror of Nest). */
export function computePreviousQuantity(
  rows: readonly Pick<
    PublicWorkMeasurement,
    'id' | 'status' | 'currentQuantity'
  >[],
  excludeId?: string,
): number {
  return roundQty(
    rows
      .filter((row) => row.id !== excludeId)
      .filter((row) => COUNTING_STATUSES.includes(row.status))
      .reduce((sum, row) => sum + row.currentQuantity, 0),
  );
}

export type CumulativeValidationInput = {
  previousQuantity: number;
  currentQuantity: number;
  boqPlannedQuantity: number;
  hasApprovedVariationCap?: boolean;
};

export type CumulativeValidationResult =
  | { ok: true; cumulativeQuantity: number }
  | { ok: false; message: string };

/**
 * Client mirror of Nest `assertCumulativeWithinBoq`.
 * Server remains authoritative (variation caps, active BOQ version).
 */
export function validateCumulativeWithinBoq(
  input: CumulativeValidationInput,
): CumulativeValidationResult {
  const cumulative = roundQty(input.previousQuantity + input.currentQuantity);
  const cap = roundQty(input.boqPlannedQuantity);

  if (cumulative <= cap) {
    return { ok: true, cumulativeQuantity: cumulative };
  }

  if (!input.hasApprovedVariationCap) {
    return {
      ok: false,
      message: `Cumulative quantity ${cumulative} exceeds BOQ quantity ${cap}. Approve a BOQ variation before measuring beyond BOQ.`,
    };
  }

  return {
    ok: false,
    message: `Cumulative quantity ${cumulative} exceeds approved BOQ quantity ${cap}`,
  };
}
