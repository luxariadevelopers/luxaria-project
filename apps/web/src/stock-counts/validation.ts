import { z } from 'zod';
import type { CountGridRow, StockCountFilterState } from './types';
import {
  computeDifference,
  differenceRequiresReason,
} from './variance';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONGO_OBJECT_ID = /^[a-fA-F0-9]{24}$/;

export const stockCountFiltersSchema = z.object({
  status: z.string(),
  location: z
    .string()
    .trim()
    .max(120, 'Location must be at most 120 characters'),
  search: z.string().trim().max(200, 'Search must be at most 200 characters'),
});

export function parseStockCountFilters(
  value: StockCountFilterState,
):
  | { ok: true; value: StockCountFilterState }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof StockCountFilterState, string>>;
    } {
  const parsed = stockCountFiltersSchema.safeParse(value);
  if (parsed.success) {
    return {
      ok: true,
      value: {
        status: value.status,
        location: parsed.data.location,
        search: parsed.data.search,
      },
    };
  }
  const fieldErrors: Partial<Record<keyof StockCountFilterState, string>> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key === 'location' || key === 'search' || key === 'status') {
      fieldErrors[key] = issue.message;
    }
  }
  return { ok: false, fieldErrors };
}

export function emptyStockCountFilters(): StockCountFilterState {
  return { status: '', location: '', search: '' };
}

const countItemSchema = z.object({
  materialId: z
    .string()
    .trim()
    .regex(MONGO_OBJECT_ID, 'Material id must be a valid ObjectId'),
  physicalQuantity: z.number().finite().min(0, 'physicalQuantity must be ≥ 0'),
  reason: z.string().trim().max(1000).optional().nullable(),
  photo: z.string().trim().max(100).optional().nullable(),
});

export const createStockCountSchema = z.object({
  projectId: z
    .string()
    .trim()
    .regex(MONGO_OBJECT_ID, 'projectId must be a valid ObjectId'),
  countDate: z
    .string()
    .trim()
    .regex(DATE_ONLY, 'countDate must be YYYY-MM-DD'),
  location: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(countItemSchema).min(1, 'At least one count line is required'),
});

export type CountGridFieldErrors = {
  rows?: Record<string, { physicalQuantity?: string; reason?: string }>;
  form?: string;
};

/**
 * Client mirror of Nest difference-reason rule before submit/create.
 * Server refreshes system qty on submit — still authoritative.
 */
export function validateCountGridRows(
  rows: readonly CountGridRow[],
): { ok: true } | { ok: false; fieldErrors: CountGridFieldErrors } {
  if (rows.length === 0) {
    return { ok: false, fieldErrors: { form: 'Add at least one material line' } };
  }
  const rowErrors: CountGridFieldErrors['rows'] = {};
  const seen = new Set<string>();

  for (const row of rows) {
    const errors: { physicalQuantity?: string; reason?: string } = {};
    if (!MONGO_OBJECT_ID.test(row.materialId.trim())) {
      errors.physicalQuantity = 'Select a valid material';
    } else if (seen.has(row.materialId)) {
      errors.physicalQuantity = 'Duplicate material on count';
    } else {
      seen.add(row.materialId);
    }

    if (!Number.isFinite(row.physicalQuantity) || row.physicalQuantity < 0) {
      errors.physicalQuantity = 'physicalQuantity must be ≥ 0';
    }

    const difference = computeDifference(
      row.physicalQuantity,
      row.systemQuantity,
    );
    if (differenceRequiresReason(difference) && !row.reason.trim()) {
      errors.reason = 'Difference requires an explanation (reason)';
    }

    if (Object.keys(errors).length > 0) {
      rowErrors[row.key] = errors;
    }
  }

  if (Object.keys(rowErrors).length > 0) {
    return { ok: false, fieldErrors: { rows: rowErrors } };
  }
  return { ok: true };
}
