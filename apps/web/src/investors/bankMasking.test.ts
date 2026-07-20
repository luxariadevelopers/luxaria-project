import { describe, expect, it } from 'vitest';
import {
  formatMaskedAccountLast4,
  formatMaskedPan,
  resolveAccountDisplay,
} from './bankMasking';

describe('bank masking — sensitive fields masked by default', () => {
  it('formats last4 with bullets', () => {
    expect(formatMaskedAccountLast4('9012')).toBe('••••9012');
    expect(formatMaskedAccountLast4(null)).toBe('••••');
  });

  it('keeps account masked until revealed', () => {
    const masked = resolveAccountDisplay({
      accountNumber: '123456789012',
      accountNumberLast4: '9012',
      revealed: false,
    });
    expect(masked.display).toBe('••••9012');
    expect(masked.canReveal).toBe(true);
    expect(masked.isRevealed).toBe(false);
    expect(masked.display).not.toContain('123456');

    const revealed = resolveAccountDisplay({
      accountNumber: '123456789012',
      accountNumberLast4: '9012',
      revealed: true,
    });
    expect(revealed.display).toBe('123456789012');
    expect(revealed.isRevealed).toBe(true);
  });

  it('cannot reveal when Nest withheld the full number', () => {
    const result = resolveAccountDisplay({
      accountNumber: null,
      accountNumberLast4: '9012',
      revealed: true,
    });
    expect(result.canReveal).toBe(false);
    expect(result.display).toBe('••••9012');
    expect(result.isRevealed).toBe(false);
  });

  it('masks PAN by default', () => {
    expect(formatMaskedPan('AAAAA1111A', false)).toBe('••••••111A');
    expect(formatMaskedPan('AAAAA1111A', true)).toBe('AAAAA1111A');
    expect(formatMaskedPan(null, false)).toBe('—');
  });
});
