import { describe, expect, it } from 'vitest';
import {
  formatMaskedAccountNumber,
  last4FromMasked,
  resolveBankAccountNumberDisplay,
  toListSafeBankAccount,
} from './masking';

describe('formatMaskedAccountNumber', () => {
  it('returns Nest masked form uppercased', () => {
    expect(formatMaskedAccountNumber('xxxxxx9012')).toBe('XXXXXX9012');
  });

  it('returns bullets when missing', () => {
    expect(formatMaskedAccountNumber(null)).toBe('••••');
    expect(formatMaskedAccountNumber('')).toBe('••••');
  });
});

describe('last4FromMasked', () => {
  it('extracts last four digits', () => {
    expect(last4FromMasked('XXXXXX9012')).toBe('9012');
  });
});

describe('resolveBankAccountNumberDisplay', () => {
  it('keeps masked by default even when full number present', () => {
    const display = resolveBankAccountNumberDisplay({
      maskedAccountNumber: 'XXXXXX9012',
      accountNumber: '123456789012',
      revealed: false,
    });
    expect(display.display).toBe('XXXXXX9012');
    expect(display.canReveal).toBe(true);
    expect(display.isRevealed).toBe(false);
  });

  it('reveals only when requested and Nest returned the number', () => {
    const display = resolveBankAccountNumberDisplay({
      maskedAccountNumber: 'XXXXXX9012',
      accountNumber: '123456789012',
      revealed: true,
    });
    expect(display.display).toBe('123456789012');
    expect(display.isRevealed).toBe(true);
  });

  it('cannot reveal when Nest nulls accountNumber', () => {
    const display = resolveBankAccountNumberDisplay({
      maskedAccountNumber: 'XXXXXX9012',
      accountNumber: null,
      revealed: true,
    });
    expect(display.display).toBe('XXXXXX9012');
    expect(display.canReveal).toBe(false);
    expect(display.isRevealed).toBe(false);
  });
});

describe('toListSafeBankAccount', () => {
  it('strips accountNumber before list render', () => {
    const safe = toListSafeBankAccount({
      accountNumber: '123456789012',
      maskedAccountNumber: 'XXXXXX9012',
    });
    expect(safe.accountNumber).toBeNull();
    expect(safe.maskedAccountNumber).toBe('XXXXXX9012');
  });
});
