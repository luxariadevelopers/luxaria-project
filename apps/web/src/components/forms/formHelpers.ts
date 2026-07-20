import type {
  FieldPath,
  FieldValues,
  Path,
  UseFormSetError,
} from 'react-hook-form';
import { toAppError } from '@/api/errors';

/**
 * Map backend `details` / inferred field errors onto react-hook-form.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: Record<string, string>,
): void {
  for (const [field, message] of Object.entries(fieldErrors)) {
    setError(field as FieldPath<T>, { type: 'server', message });
  }
}

/** Convenience: normalise an API error and apply its fieldErrors. */
export function applyApiFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
): ReturnType<typeof toAppError> {
  const appError = toAppError(error);
  applyServerFieldErrors(setError, appError.fieldErrors);
  return appError;
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Shape a create payload: drop null/undefined/empty strings (Nest optional fields).
 * Does not invent DTO keys — only filters the values object you pass.
 */
export function shapeCreatePayload<T extends Record<string, unknown>>(
  values: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(values) as [keyof T, T[keyof T]][]) {
    if (isEmptyValue(value)) continue;
    if (typeof value === 'string') {
      out[key] = value.trim() as T[keyof T];
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * Shape a PATCH payload from dirty fields only (react-hook-form `dirtyFields`).
 */
export function shapeUpdatePayload<T extends Record<string, unknown>>(
  values: T,
  dirtyFields: Partial<Record<keyof T, unknown>>,
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(dirtyFields) as (keyof T)[]) {
    if (!dirtyFields[key]) continue;
    const value = values[key];
    if (typeof value === 'string') {
      out[key] = value.trim() as T[keyof T];
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Disable edit when the user lacks permission or the record status is immutable.
 * Status check is caller-supplied (use shared status catalogs / editable sets).
 */
export function isFormEditable(options: {
  hasPermission: boolean;
  statusAllowsEdit: boolean;
}): boolean {
  return options.hasPermission && options.statusAllowsEdit;
}

/** Type helper for setError paths. */
export type FormFieldPath<T extends FieldValues> = Path<T>;
