import { describe, expect, it } from 'vitest';
import {
  formatOptionalCount,
  formatOptionalMoney,
  hasMetric,
} from './formatMetric';

describe('formatOptionalMoney / count', () => {
  it('does not invent zeros for missing metrics', () => {
    expect(formatOptionalMoney(undefined)).toBe('—');
    expect(formatOptionalMoney(null)).toBe('—');
    expect(formatOptionalCount(undefined)).toBe('—');
    expect(hasMetric(undefined)).toBe(false);
  });

  it('formats real zero from the API', () => {
    expect(formatOptionalMoney(0)).toContain('0');
    expect(formatOptionalCount(0)).toBe('0');
    expect(hasMetric(0)).toBe(true);
  });
});
