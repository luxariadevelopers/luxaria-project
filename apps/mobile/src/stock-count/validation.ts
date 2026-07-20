import type { CountLine } from './types';
import { computeDifference, differenceRequiresReason } from './variance';

const MONGO_OBJECT_ID = /^[a-fA-F0-9]{24}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type CountLineFieldErrors = {
  physicalQuantity?: string;
  reason?: string;
};

export type CountValidationResult =
  | { ok: true }
  | {
      ok: false;
      formError?: string;
      lineErrors: Record<string, CountLineFieldErrors>;
    };

/**
 * Client mirror of Nest difference-reason rule before create/submit.
 * Server refreshes system qty on submit — still authoritative.
 */
export function validateCountLines(
  lines: readonly CountLine[],
): CountValidationResult {
  if (lines.length === 0) {
    return {
      ok: false,
      formError: 'Add at least one material line',
      lineErrors: {},
    };
  }

  const lineErrors: Record<string, CountLineFieldErrors> = {};
  const seen = new Set<string>();

  for (const line of lines) {
    const errors: CountLineFieldErrors = {};

    if (!MONGO_OBJECT_ID.test(line.materialId.trim())) {
      errors.physicalQuantity = 'Select a valid material';
    } else if (seen.has(line.materialId)) {
      errors.physicalQuantity = 'Duplicate material on count';
    } else {
      seen.add(line.materialId);
    }

    if (!Number.isFinite(line.physicalQuantity) || line.physicalQuantity < 0) {
      errors.physicalQuantity = 'Physical quantity must be ≥ 0';
    }

    const difference = computeDifference(
      line.physicalQuantity,
      line.systemQuantity,
    );
    if (differenceRequiresReason(difference) && !line.reason.trim()) {
      errors.reason = 'Difference requires an explanation (reason)';
    }

    if (Object.keys(errors).length > 0) {
      lineErrors[line.key] = errors;
    }
  }

  if (Object.keys(lineErrors).length > 0) {
    return { ok: false, lineErrors };
  }
  return { ok: true };
}

export function validateCountHeader(input: {
  projectId: string;
  countDate: string;
}): { ok: true } | { ok: false; message: string } {
  if (!MONGO_OBJECT_ID.test(input.projectId.trim())) {
    return { ok: false, message: 'Select a project first' };
  }
  if (!DATE_ONLY.test(input.countDate.trim())) {
    return { ok: false, message: 'countDate must be YYYY-MM-DD' };
  }
  return { ok: true };
}
