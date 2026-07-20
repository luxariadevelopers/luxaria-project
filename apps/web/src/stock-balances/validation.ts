import { z } from 'zod';
import type { StockBalanceFilterState } from './types';

/** Nest `GetStockBalanceQueryDto.location` max 120; location is optional filter. */
export const stockBalanceFiltersSchema = z.object({
  location: z
    .string()
    .trim()
    .max(120, 'Location must be at most 120 characters'),
  search: z.string().trim().max(200, 'Search must be at most 200 characters'),
  lowStockOnly: z.boolean(),
});

export type StockBalanceFiltersParsed = z.infer<
  typeof stockBalanceFiltersSchema
>;

export function parseStockBalanceFilters(
  value: StockBalanceFilterState,
):
  | { ok: true; value: StockBalanceFiltersParsed }
  | { ok: false; fieldErrors: Partial<Record<keyof StockBalanceFilterState, string>> } {
  const parsed = stockBalanceFiltersSchema.safeParse(value);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  const fieldErrors: Partial<Record<keyof StockBalanceFilterState, string>> =
    {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (
      key === 'location' ||
      key === 'search' ||
      key === 'lowStockOnly'
    ) {
      fieldErrors[key] = issue.message;
    }
  }
  return { ok: false, fieldErrors };
}

export function emptyStockBalanceFilters(): StockBalanceFilterState {
  return {
    location: '',
    search: '',
    lowStockOnly: false,
  };
}
