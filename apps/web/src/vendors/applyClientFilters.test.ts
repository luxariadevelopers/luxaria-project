import { describe, expect, it } from 'vitest';
import { applyClientFilters } from './applyClientFilters';
import {
  VendorStatus,
  VendorVerificationStatus,
  type VendorListRow,
} from './types';

function row(partial: Partial<VendorListRow> & Pick<VendorListRow, 'id' | 'legalName'>): VendorListRow {
  return {
    vendorCode: 'VEN-000001',
    tradeName: null,
    gstin: null,
    pan: null,
    email: null,
    phone: null,
    contactPerson: null,
    materialCategories: [],
    paymentTerms: null,
    rating: null,
    verificationStatus: VendorVerificationStatus.Pending,
    status: VendorStatus.Active,
    blockReason: null,
    ...partial,
  };
}

describe('applyClientFilters — status / category / blocked', () => {
  const rows: VendorListRow[] = [
    row({
      id: '1',
      legalName: 'Active Steels',
      status: VendorStatus.Active,
      materialCategories: ['steel'],
      vendorCode: 'VEN-000001',
    }),
    row({
      id: '2',
      legalName: 'Blocked Cement',
      status: VendorStatus.Blocked,
      blockReason: 'Quality failures',
      materialCategories: ['cement'],
      vendorCode: 'VEN-000002',
    }),
    row({
      id: '3',
      legalName: 'Pending Electrical',
      status: VendorStatus.PendingVerification,
      materialCategories: ['electrical', 'steel'],
      vendorCode: 'VEN-000003',
    }),
  ];

  it('filters by blocked status', () => {
    const blocked = applyClientFilters(rows, {
      status: VendorStatus.Blocked,
    });
    expect(blocked).toHaveLength(1);
    expect(blocked[0]?.id).toBe('2');
    expect(blocked[0]?.blockReason).toBe('Quality failures');
  });

  it('filters by material category', () => {
    const steel = applyClientFilters(rows, { materialCategory: 'steel' });
    expect(steel.map((r) => r.id).sort()).toEqual(['1', '3']);
  });

  it('combines search with status filter', () => {
    const result = applyClientFilters(rows, {
      status: VendorStatus.Active,
      search: 'steels',
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.legalName).toBe('Active Steels');
  });

  it('returns empty when blocked filter has no matches after search', () => {
    const result = applyClientFilters(rows, {
      status: VendorStatus.Blocked,
      search: 'electrical',
    });
    expect(result).toHaveLength(0);
  });
});
