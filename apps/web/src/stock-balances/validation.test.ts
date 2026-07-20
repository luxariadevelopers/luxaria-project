import { describe, expect, it } from 'vitest';
import { parseStockBalanceFilters } from './validation';

describe('parseStockBalanceFilters', () => {
  it('accepts empty location and search', () => {
    const parsed = parseStockBalanceFilters({
      location: '',
      search: '',
      lowStockOnly: false,
    });
    expect(parsed.ok).toBe(true);
  });

  it('rejects location over Nest max length (120)', () => {
    const parsed = parseStockBalanceFilters({
      location: 'x'.repeat(121),
      search: '',
      lowStockOnly: false,
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.fieldErrors.location).toMatch(/120/);
    }
  });
});
