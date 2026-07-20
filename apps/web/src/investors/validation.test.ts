import { describe, expect, it } from 'vitest';
import {
  investorCreateSchema,
  isValidCin,
  isValidGstin,
  isValidPan,
} from './validation';
import { InvestorType } from './types';

describe('investor create validation', () => {
  it('validates PAN / GSTIN / CIN formats', () => {
    expect(isValidPan('AAAAA1111A')).toBe(true);
    expect(isValidPan('BAD')).toBe(false);
    expect(isValidGstin('33ABCDE1234F1Z5')).toBe(true);
    expect(isValidGstin('33ABCDE1234F1Z')).toBe(false);
    expect(isValidCin('U45200TN2020PTC123456')).toBe(true);
    expect(isValidCin('X45200TN2020PTC123456')).toBe(false);
  });

  it('requires CIN for company investors', () => {
    const result = investorCreateSchema.safeParse({
      investorType: InvestorType.Company,
      legalName: 'Acme Pvt Ltd',
      pan: '',
      gstin: '',
      cin: '',
      directorId: '',
      email: '',
      phone: '',
      ifsc: '',
      accountNumber: '',
      bankName: '',
    });
    expect(result.success).toBe(false);
  });

  it('requires directorId for director_as_project_investor', () => {
    const result = investorCreateSchema.safeParse({
      investorType: InvestorType.DirectorAsProjectInvestor,
      legalName: 'Director Invest',
      pan: 'AAAAA1111A',
      gstin: '',
      cin: '',
      directorId: '',
      email: '',
      phone: '',
      ifsc: '',
      accountNumber: '',
      bankName: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts individual with optional PAN', () => {
    const result = investorCreateSchema.safeParse({
      investorType: InvestorType.Individual,
      legalName: 'Person One',
      pan: 'AAAAA1111A',
      gstin: '',
      cin: '',
      directorId: '',
      email: 'p@example.com',
      phone: '',
      ifsc: '',
      accountNumber: '',
      bankName: '',
    });
    expect(result.success).toBe(true);
  });
});
