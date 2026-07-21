import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as companyApi from './api';
import { CompanyAddressType, CompanyCapitalType, CompanyStatus, type PublicCompany } from './types';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  clientPost: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => mocks.apiGet(...args),
  apiPatch: (...args: unknown[]) => mocks.apiPatch(...args),
  apiPost: (...args: unknown[]) => mocks.apiPost(...args),
  apiClient: {
    post: (...args: unknown[]) => mocks.clientPost(...args),
  },
}));

const companyId = '507f1f77bcf86cd799439011';

const company: PublicCompany = {
  id: companyId,
  companyCode: 'LUX-001',
  legalName: 'Luxaria Developers Private Limited',
  tradeName: 'Luxaria',
  cin: 'U45200TN2020PTC123456',
  pan: 'ABCDE1234F',
  tan: 'CHEL12345A',
  gstin: '33ABCDE1234F1Z5',
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
    line2: 'Second floor',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600002',
    country: 'India',
  },
  email: 'admin@luxaria.example',
  phone: '+91 90000 00000',
  website: 'https://luxaria.example',
  authorisedShareCapital: 10_000_000,
  paidUpShareCapital: 5_000_000,
  financialYearStartMonth: 4,
  logo: null,
  status: CompanyStatus.Active,
  isPrimary: true,
};

describe('company administration API', () => {
  beforeEach(() => {
    mocks.apiGet.mockReset();
    mocks.apiPatch.mockReset();
    mocks.apiPost.mockReset();
    mocks.clientPost.mockReset();
  });

  it('uses only the authenticated id or primary endpoint for current company', async () => {
    mocks.apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: company,
    });

    await companyApi.fetchCurrentCompany(null);
    await companyApi.fetchCurrentCompany(companyId);

    expect(mocks.apiGet).toHaveBeenNthCalledWith(1, '/companies/primary');
    expect(mocks.apiGet).toHaveBeenNthCalledWith(2, `/companies/${companyId}`);
  });

  it('wires profile, statutory, and capital updates to supported endpoints', async () => {
    mocks.apiPatch.mockResolvedValue({
      success: true,
      message: 'updated',
      data: company,
    });
    mocks.apiPost.mockResolvedValue({
      success: true,
      message: 'updated',
      data: company,
    });

    const profile = {
      tradeName: 'Luxaria',
      email: null,
      financialYearStartMonth: 4,
    };
    const statutory = {
      legalName: company.legalName,
      pan: company.pan,
    };
    const capital = {
      capitalType: CompanyCapitalType.Authorised,
      newAmount: 12_000_000,
      changeReason: 'Board approval',
      reference: 'BR-2026-07',
    };

    await companyApi.updateCompanyProfile(companyId, profile);
    await companyApi.updateCompanyStatutory(companyId, statutory);
    await companyApi.updateCompanyCapital(companyId, capital);

    expect(mocks.apiPatch).toHaveBeenNthCalledWith(1, `/companies/${companyId}`, profile);
    expect(mocks.apiPatch).toHaveBeenNthCalledWith(
      2,
      `/companies/${companyId}/statutory`,
      statutory,
    );
    expect(mocks.apiPost).toHaveBeenCalledWith(`/companies/${companyId}/capital`, capital);
  });

  it('uploads the logo as the controller file field', async () => {
    mocks.clientPost.mockResolvedValue({
      data: {
        success: true,
        message: 'uploaded',
        data: { ...company, logo: 'uploads/company/logo.png' },
      },
    });
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    await companyApi.uploadCompanyLogo(companyId, file);

    const [url, form, config] = mocks.clientPost.mock.calls[0] as [
      string,
      FormData,
      { headers: Record<string, unknown> },
    ];
    expect(url).toBe(`/companies/${companyId}/logo`);
    expect(form.get('file')).toBe(file);
    expect(config.headers['Content-Type']).toBeUndefined();
  });

  it('requests and normalises address and capital history pagination', async () => {
    mocks.apiGet
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'address-1',
            companyId,
            addressType: CompanyAddressType.Registered,
            address: company.registeredAddress,
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
            effectiveTo: null,
            changeReason: 'Registered office moved',
          },
        ],
        meta: {
          page: 2,
          limit: 10,
          total: 12,
          totalPages: 2,
          hasNextPage: false,
          hasPrevPage: true,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'capital-1',
            companyId,
            capitalType: CompanyCapitalType.PaidUp,
            previousAmount: 4_000_000,
            newAmount: 5_000_000,
            effectiveFrom: '2026-07-01T00:00:00.000Z',
            changeReason: 'Share allotment',
            reference: 'PAS-3/2026',
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });

    const addresses = await companyApi.fetchCompanyAddressHistory(companyId, {
      page: 2,
      limit: 10,
      addressType: CompanyAddressType.Registered,
    });
    const capital = await companyApi.fetchCompanyCapitalHistory(companyId, {
      capitalType: CompanyCapitalType.PaidUp,
    });

    expect(mocks.apiGet).toHaveBeenNthCalledWith(1, `/companies/${companyId}/address-history`, {
      page: 2,
      limit: 10,
      addressType: CompanyAddressType.Registered,
    });
    expect(mocks.apiGet).toHaveBeenNthCalledWith(2, `/companies/${companyId}/capital-history`, {
      page: 1,
      limit: 20,
      capitalType: CompanyCapitalType.PaidUp,
    });
    expect(addresses.items[0]?.effectiveFrom).toBe('2026-01-01T00:00:00.000Z');
    expect(addresses.meta.total).toBe(12);
    expect(capital.items[0]?.newAmount).toBe(5_000_000);
  });

  it('does not expose unsupported list, create, or lifecycle actions', () => {
    expect(companyApi).not.toHaveProperty('fetchCompanies');
    expect(companyApi).not.toHaveProperty('createCompany');
    expect(companyApi).not.toHaveProperty('activateCompany');
    expect(companyApi).not.toHaveProperty('deactivateCompany');
  });
});
