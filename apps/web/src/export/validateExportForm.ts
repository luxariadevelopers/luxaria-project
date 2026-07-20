import { isoDateOnlySchema } from '@luxaria/shared-validation';
import {
  FINANCE_DASHBOARD_MAX_HORIZON_DAYS,
} from './constants';
import type {
  ExportDescriptor,
  ExportFormValues,
  ExportValidationResult,
} from './types';

function inclusiveDaySpan(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.floor((b - a) / 86_400_000) + 1;
}

function isFilled(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Client-side export form validation aligned with Nest rules:
 * - `from` must be on or before `to`
 * - optional max inclusive range (`maxRangeDays`)
 * - finance `horizonDays` 1…180 (`@Min(1)` / `@Max(180)`)
 * - required filters
 * - at least one field when field selection is required
 */
export function validateExportForm(
  descriptor: ExportDescriptor,
  raw: ExportFormValues,
): ExportValidationResult {
  const fieldErrors: Partial<Record<keyof ExportFormValues, string>> = {};
  const values: ExportFormValues = {
    ...raw,
    format: raw.format,
    from: raw.from.trim(),
    to: raw.to.trim(),
    date: raw.date.trim(),
    projectId: raw.projectId.trim(),
    financialYearId: raw.financialYearId.trim(),
    accountId: raw.accountId.trim(),
    partyId: raw.partyId.trim(),
    contractorId: raw.contractorId.trim(),
    vendorId: raw.vendorId.trim(),
    materialId: raw.materialId.trim(),
    horizonDays: raw.horizonDays.trim(),
    selectedFieldIds: [...raw.selectedFieldIds],
  };

  if (!descriptor.allowedFormats.includes(values.format)) {
    fieldErrors.format = `Format must be one of: ${descriptor.allowedFormats.join(', ')}`;
  }

  if (descriptor.showDateRange) {
    if (isFilled(values.from)) {
      const parsed = isoDateOnlySchema.safeParse(values.from);
      if (!parsed.success) {
        fieldErrors.from = 'Use YYYY-MM-DD';
      }
    }
    if (isFilled(values.to)) {
      const parsed = isoDateOnlySchema.safeParse(values.to);
      if (!parsed.success) {
        fieldErrors.to = 'Use YYYY-MM-DD';
      }
    }
    if (
      isFilled(values.from) &&
      isFilled(values.to) &&
      !fieldErrors.from &&
      !fieldErrors.to
    ) {
      if (values.from > values.to) {
        fieldErrors.to = 'from must be on or before to';
      } else if (descriptor.maxRangeDays != null) {
        const span = inclusiveDaySpan(values.from, values.to);
        if (!Number.isNaN(span) && span > descriptor.maxRangeDays) {
          fieldErrors.to = `Date range cannot exceed ${descriptor.maxRangeDays} days`;
        }
      }
    }
  }

  if (descriptor.showAsOfDate && isFilled(values.date)) {
    const parsed = isoDateOnlySchema.safeParse(values.date);
    if (!parsed.success) {
      fieldErrors.date = 'Use YYYY-MM-DD';
    }
  }

  if (descriptor.showHorizonDays) {
    if (!isFilled(values.horizonDays)) {
      // optional on API — leave empty to use backend default 30
    } else {
      const n = Number(values.horizonDays);
      if (!Number.isInteger(n) || n < 1) {
        fieldErrors.horizonDays = 'Must be an integer ≥ 1';
      } else if (n > FINANCE_DASHBOARD_MAX_HORIZON_DAYS) {
        fieldErrors.horizonDays = `Cannot exceed ${FINANCE_DASHBOARD_MAX_HORIZON_DAYS} days`;
      }
    }
  }

  for (const filter of descriptor.requiredFilters ?? []) {
    const value = values[filter.key];
    if (typeof value !== 'string' || !isFilled(value)) {
      fieldErrors[filter.key] = `${filter.label} is required`;
    }
  }

  if (
    descriptor.requireFieldSelection &&
    (descriptor.fields?.length ?? 0) > 0 &&
    values.selectedFieldIds.length === 0
  ) {
    fieldErrors.selectedFieldIds = 'Select at least one field';
  }

  const keys = Object.keys(fieldErrors) as (keyof ExportFormValues)[];
  if (keys.length > 0) {
    const first = fieldErrors[keys[0]!];
    return {
      ok: false,
      message: first ?? 'Fix validation errors before exporting',
      fieldErrors,
    };
  }

  return { ok: true, values };
}

export function defaultExportFormValues(
  descriptor: ExportDescriptor,
): ExportFormValues {
  return {
    format: descriptor.defaultFormat,
    from: '',
    to: '',
    date: '',
    projectId: '',
    financialYearId: '',
    accountId: '',
    partyId: '',
    contractorId: '',
    vendorId: '',
    materialId: '',
    horizonDays: '',
    selectedFieldIds: (descriptor.fields ?? [])
      .filter((f) => f.defaultSelected !== false)
      .map((f) => f.id),
  };
}
