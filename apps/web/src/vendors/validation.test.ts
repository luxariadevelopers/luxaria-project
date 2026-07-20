import { describe, expect, it } from 'vitest';
import {
  emptyVendorCreateForm,
  isValidGstin,
  isValidPan,
  parseMaterialCategories,
  vendorCreateSchema,
} from './validation';

describe('vendor create validation', () => {
  it('validates PAN / GSTIN formats', () => {
    expect(isValidPan('AAAAA1111A')).toBe(true);
    expect(isValidPan('BAD')).toBe(false);
    expect(isValidGstin('33ABCDE1234F1Z5')).toBe(true);
    expect(isValidGstin('33ABCDE1234F1Z')).toBe(false);
  });

  it('rejects invalid GSTIN on create schema', () => {
    const result = vendorCreateSchema.safeParse({
      ...emptyVendorCreateForm(),
      legalName: 'Acme Supplies',
      pan: 'AAAAA1111A',
      gstin: 'BADGSTIN',
      materialCategoriesText: 'steel',
    });
    expect(result.success).toBe(false);
  });

  it('accepts vendor with optional PAN/GSTIN and categories', () => {
    const result = vendorCreateSchema.safeParse({
      ...emptyVendorCreateForm(),
      legalName: 'Acme Supplies',
      tradeName: 'Acme',
      pan: 'AAAAA1111A',
      gstin: '33ABCDE1234F1Z5',
      email: 'v@example.com',
      phone: '999',
      contactPerson: 'Ravi',
      materialCategoriesText: 'steel, cement',
      paymentTerms: 'Net 30',
      rating: '4',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(parseMaterialCategories(result.data.materialCategoriesText)).toEqual(
        ['steel', 'cement'],
      );
    }
  });

  it('rejects invalid material categories', () => {
    const result = vendorCreateSchema.safeParse({
      ...emptyVendorCreateForm(),
      legalName: 'Acme',
      materialCategoriesText: 'Bad Category!',
    });
    expect(result.success).toBe(false);
  });
});
