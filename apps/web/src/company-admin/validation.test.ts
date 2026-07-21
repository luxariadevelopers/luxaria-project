import { describe, expect, it } from 'vitest';
import { CompanyCapitalType, CompanyStatus, type PublicCompany } from './types';
import {
  buildCompanyCapitalFormSchema,
  buildCompanyProfileDefaults,
  companyProfileFormSchema,
  companyStatutoryFormSchema,
  resolveCompanyProfileField,
  toUpdateCompanyInput,
  toUpdateStatutoryInput,
  validateCompanyLogo,
} from './validation';

const company: PublicCompany = {
  id: '507f1f77bcf86cd799439011',
  companyCode: 'LUX-001',
  legalName: 'Luxaria Developers Private Limited',
  tradeName: 'Luxaria',
  cin: null,
  pan: null,
  tan: null,
  gstin: null,
  registeredAddress: {
    line1: '12 Main Road',
    line2: null,
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    country: 'India',
  },
  corporateAddress: {
    line1: '14 Main Road',
    line2: null,
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600002',
    country: 'India',
  },
  email: null,
  phone: null,
  website: null,
  authorisedShareCapital: 10_000_000,
  paidUpShareCapital: 5_000_000,
  financialYearStartMonth: 4,
  logo: null,
  status: CompanyStatus.Active,
  isPrimary: true,
};

describe('company administration validation', () => {
  it('matches profile DTO email, month, address, and Indian PIN rules', () => {
    const values = buildCompanyProfileDefaults(company);

    expect(companyProfileFormSchema.safeParse(values).success).toBe(true);
    expect(
      companyProfileFormSchema.safeParse({
        ...values,
        email: 'not-an-email',
        financialYearStartMonth: 13,
        registeredAddress: {
          ...values.registeredAddress,
          pincode: '000001',
        },
      }).success,
    ).toBe(false);
  });

  it('trims profile fields and sends optional DTO values as null', () => {
    const values = buildCompanyProfileDefaults(company);
    const input = toUpdateCompanyInput({
      ...values,
      tradeName: '  Luxaria Homes  ',
      email: '  ADMIN@EXAMPLE.COM ',
      phone: '   ',
      website: '',
      registeredAddress: {
        ...values.registeredAddress,
        line1: '  12 Main Road ',
      },
    });

    expect(input).toMatchObject({
      tradeName: 'Luxaria Homes',
      email: 'admin@example.com',
      phone: null,
      website: null,
      registeredAddress: {
        line1: '12 Main Road',
        line2: null,
      },
    });
  });

  it('normalises and validates CIN, PAN, TAN, and GSTIN exactly as Nest', () => {
    const parsed = companyStatutoryFormSchema.safeParse({
      legalName: company.legalName,
      cin: 'u45200tn2020ptc123456',
      pan: 'abcde1234f',
      tan: 'chel12345a',
      gstin: '33abcde1234f1z5',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(toUpdateStatutoryInput(parsed.data)).toEqual({
        legalName: company.legalName,
        cin: 'U45200TN2020PTC123456',
        pan: 'ABCDE1234F',
        tan: 'CHEL12345A',
        gstin: '33ABCDE1234F1Z5',
      });
    }

    expect(
      companyStatutoryFormSchema.safeParse({
        legalName: company.legalName,
        cin: 'invalid',
        pan: '123',
        tan: '123',
        gstin: '123',
      }).success,
    ).toBe(false);
  });

  it('enforces immutable capital endpoint constraints before confirmation', () => {
    const schema = buildCompanyCapitalFormSchema(company);
    const base = {
      capitalType: CompanyCapitalType.PaidUp,
      newAmount: 6_000_000,
      effectiveFrom: '2026-07-21',
      changeReason: 'Allotment',
      reference: 'PAS-3',
    };

    expect(schema.safeParse(base).success).toBe(true);
    expect(schema.safeParse({ ...base, newAmount: 5_000_000 }).success).toBe(false);
    expect(schema.safeParse({ ...base, newAmount: 10_000_000.001 }).success).toBe(false);
    expect(schema.safeParse({ ...base, newAmount: 11_000_000 }).success).toBe(false);
    expect(
      schema.safeParse({
        ...base,
        capitalType: CompanyCapitalType.Authorised,
        newAmount: 4_000_000,
      }).success,
    ).toBe(false);
  });

  it('matches the controller logo MIME, extension, and 2 MB limit', () => {
    const valid = new File(['logo'], 'logo.webp', {
      type: 'image/webp',
    });
    const wrongType = new File(['logo'], 'logo.svg', {
      type: 'image/svg+xml',
    });
    const wrongExtension = new File(['logo'], 'logo.txt', {
      type: 'image/png',
    });
    const tooLarge = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'logo.png', {
      type: 'image/png',
    });

    expect(validateCompanyLogo(valid)).toBeNull();
    expect(validateCompanyLogo(wrongType)).toMatch(/PNG/i);
    expect(validateCompanyLogo(wrongExtension)).toMatch(/filename/i);
    expect(validateCompanyLogo(tooLarge)).toMatch(/2 MB/i);
  });

  it('maps nested backend validation fields to form controls', () => {
    expect(resolveCompanyProfileField('body.registeredAddress[pincode]')).toBe(
      'registeredAddress.pincode',
    );
    expect(resolveCompanyProfileField('status')).toBeNull();
  });
});
