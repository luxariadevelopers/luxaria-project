import {
  WorkMeasurementStatus,
  type PublicWorkMeasurement,
} from './types';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONGO_OBJECT_ID = /^[a-fA-F0-9]{24}$/;

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function isMongoObjectId(value: string): boolean {
  return MONGO_OBJECT_ID.test(value.trim());
}

export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value.trim());
}

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
  | { ok: false; message: string; cumulativeQuantity: number };

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
      cumulativeQuantity: cumulative,
      message: `Cumulative quantity ${cumulative} exceeds BOQ quantity ${cap}. Approve a BOQ variation before measuring beyond BOQ.`,
    };
  }

  return {
    ok: false,
    cumulativeQuantity: cumulative,
    message: `Cumulative quantity ${cumulative} exceeds approved BOQ quantity ${cap}`,
  };
}

export type MeasurementFormValidationInput = {
  projectId: string;
  contractorId: string;
  boqItemId: string;
  location: string;
  measurementDate: string;
  currentQuantity: number;
  previousQuantity: number;
  boqPlannedQuantity: number;
  drawingReference?: string | null;
  photoCount: number;
  requirePhotos?: boolean;
};

export function validateMeasurementForm(
  input: MeasurementFormValidationInput,
): { ok: true } | { ok: false; message: string } {
  if (!isMongoObjectId(input.projectId)) {
    return { ok: false, message: 'Select a valid project' };
  }
  if (!isMongoObjectId(input.contractorId)) {
    return { ok: false, message: 'Select a valid contractor' };
  }
  if (!isMongoObjectId(input.boqItemId)) {
    return { ok: false, message: 'Select a valid BOQ item' };
  }
  if (!input.location.trim()) {
    return { ok: false, message: 'Location is required' };
  }
  if (input.location.trim().length > 240) {
    return { ok: false, message: 'Location must be at most 240 characters' };
  }
  if (!isDateOnly(input.measurementDate)) {
    return { ok: false, message: 'measurementDate must be YYYY-MM-DD' };
  }
  if (!Number.isFinite(input.currentQuantity) || input.currentQuantity < 0) {
    return { ok: false, message: 'currentQuantity must be ≥ 0' };
  }
  if (
    input.drawingReference != null &&
    input.drawingReference.trim().length > 200
  ) {
    return {
      ok: false,
      message: 'drawingReference must be at most 200 characters',
    };
  }
  if (input.requirePhotos !== false && input.photoCount < 1) {
    return {
      ok: false,
      message: 'At least one evidence photo is required',
    };
  }

  const cumulative = validateCumulativeWithinBoq({
    previousQuantity: input.previousQuantity,
    currentQuantity: input.currentQuantity,
    boqPlannedQuantity: input.boqPlannedQuantity,
  });
  if (!cumulative.ok) {
    return { ok: false, message: cumulative.message };
  }

  return { ok: true };
}
