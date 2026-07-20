import { z } from 'zod';

/** Mirrors `roundQty` in DPR validation (6 decimal places). */
export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Finite quantity (PO/GRN/DPR lines use `@Min(0)` / assertNonNegative). */
export const quantitySchema = z
  .number({
    required_error: 'Quantity is required',
    invalid_type_error: 'Quantity must be a number',
  })
  .finite('Quantity must be a finite number')
  .min(0, 'Quantity must be ≥ 0');

/** Strictly positive quantity (`@Min(1)` style counts). */
export const quantityPositiveSchema = quantitySchema.min(
  1e-9,
  'Quantity must be greater than 0',
);

export const quantityOptionalSchema = quantitySchema.optional().nullable();

export type Quantity = z.infer<typeof quantitySchema>;
