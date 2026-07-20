import { describe, expect, it } from 'vitest';
import {
  directorFormSchema,
  isValidDin,
  isValidPan,
} from './validation';

describe('DIN / PAN validation', () => {
  it('accepts empty optional DIN/PAN', () => {
    expect(isValidDin('')).toBe(true);
    expect(isValidDin(null)).toBe(true);
    expect(isValidPan('')).toBe(true);
    expect(isValidPan(null)).toBe(true);
  });

  it('validates 8-digit DIN', () => {
    expect(isValidDin('10000001')).toBe(true);
    expect(isValidDin('1234567')).toBe(false);
    expect(isValidDin('ABCDEFGH')).toBe(false);
  });

  it('validates Indian PAN format', () => {
    expect(isValidPan('AAAAA1111A')).toBe(true);
    expect(isValidPan('aaaaa1111a')).toBe(true);
    expect(isValidPan('AAAA1111A')).toBe(false);
  });

  it('rejects invalid DIN/PAN on form schema when provided', () => {
    const badDin = directorFormSchema.safeParse({
      fullName: 'Test',
      din: '12',
      pan: '',
      email: '',
      phone: '',
      address: '',
      appointmentDate: '',
      status: 'active',
    });
    expect(badDin.success).toBe(false);

    const badPan = directorFormSchema.safeParse({
      fullName: 'Test',
      din: '10000001',
      pan: 'BAD',
      email: '',
      phone: '',
      address: '',
      appointmentDate: '',
      status: 'active',
    });
    expect(badPan.success).toBe(false);

    const ok = directorFormSchema.safeParse({
      fullName: 'Director One',
      din: '10000001',
      pan: 'AAAAA1111A',
      email: 'director1@luxariadevelopers.com',
      phone: '',
      address: '',
      appointmentDate: '',
      status: 'active',
    });
    expect(ok.success).toBe(true);
  });
});
