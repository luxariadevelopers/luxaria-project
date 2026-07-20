import { describe, expect, it } from 'vitest';
import {
  formatMaskedAccountLast4,
  resolveAccountDisplay,
  toListSafeVendorBank,
} from './bankMasking';

describe('formatMaskedAccountLast4', () => {
  it('masks with last4 when present', () => {
    expect(formatMaskedAccountLast4('9012')).toBe('••••9012');
  });

  it('returns bullets when missing', () => {
    expect(formatMaskedAccountLast4(null)).toBe('••••');
  });
});

describe('resolveAccountDisplay', () => {
  it('keeps account masked by default even when Nest returns full number', () => {
    const display = resolveAccountDisplay({
      accountNumber: '123456789012',
      accountNumberLast4: '9012',
      revealed: false,
    });
    expect(display.display).toBe('••••9012');
    expect(display.canReveal).toBe(true);
    expect(display.isRevealed).toBe(false);
  });

  it('reveals only when requested and full number is available', () => {
    const display = resolveAccountDisplay({
      accountNumber: '123456789012',
      accountNumberLast4: '9012',
      revealed: true,
    });
    expect(display.display).toBe('123456789012');
    expect(display.isRevealed).toBe(true);
  });

  it('cannot reveal when API omitted the full number', () => {
    const display = resolveAccountDisplay({
      accountNumber: null,
      accountNumberLast4: '9012',
      revealed: true,
    });
    expect(display.display).toBe('••••9012');
    expect(display.canReveal).toBe(false);
    expect(display.isRevealed).toBe(false);
  });
});

describe('toListSafeVendorBank', () => {
  it('nulls full account number for list projection', () => {
    const safe = toListSafeVendorBank({
      bankName: 'HDFC',
      branchName: 'MG Road',
      ifsc: 'HDFC0001234',
      accountHolderName: 'Acme',
      accountNumber: '123456789012',
      accountNumberLast4: '9012',
    });
    expect(safe.accountNumber).toBeNull();
    expect(safe.accountNumberLast4).toBe('9012');
  });
});
