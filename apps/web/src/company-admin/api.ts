import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CompanyAddress,
  CompanyPaginationMeta,
  ListAddressHistoryQuery,
  ListCapitalHistoryQuery,
  PaginatedCompanyHistory,
  PublicAddressHistory,
  PublicCapitalHistory,
  PublicCompany,
  UpdateCapitalInput,
  UpdateCompanyInput,
  UpdateStatutoryInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseAddress(address: CompanyAddress): CompanyAddress {
  return {
    ...address,
    line2: address.line2 ?? null,
    country: address.country || 'India',
  };
}

function normaliseCompany(company: PublicCompany): PublicCompany {
  return {
    ...company,
    cin: company.cin ?? null,
    pan: company.pan ?? null,
    tan: company.tan ?? null,
    gstin: company.gstin ?? null,
    registeredAddress: normaliseAddress(company.registeredAddress),
    corporateAddress: normaliseAddress(company.corporateAddress),
    email: company.email ?? null,
    phone: company.phone ?? null,
    website: company.website ?? null,
    authorisedShareCapital: Number(company.authorisedShareCapital),
    paidUpShareCapital: Number(company.paidUpShareCapital),
    logo: company.logo ?? null,
    createdAt: toIso(company.createdAt) ?? undefined,
    updatedAt: toIso(company.updatedAt) ?? undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): CompanyPaginationMeta {
  const total = Number(meta?.total ?? 0);
  return {
    page: Number(meta?.page ?? page),
    limit: Number(meta?.limit ?? limit),
    total,
    totalPages: Number(meta?.totalPages ?? Math.max(1, Math.ceil(total / limit))),
    hasNextPage: Boolean(meta?.hasNextPage),
    hasPrevPage: Boolean(meta?.hasPrevPage),
  };
}

/**
 * Fetch the authenticated tenant. A route parameter must never be passed here:
 * callers supply only `AuthUser.companyId`, or omit it to use the primary
 * company endpoint.
 */
export async function fetchCurrentCompany(
  authenticatedCompanyId?: string | null,
): Promise<PublicCompany> {
  const response = await apiGet<PublicCompany>(
    authenticatedCompanyId ? `/companies/${authenticatedCompanyId}` : '/companies/primary',
  );
  if (!response.data) {
    throw new Error(response.message || 'Company not found');
  }
  return normaliseCompany(response.data);
}

export async function updateCompanyProfile(
  companyId: string,
  input: UpdateCompanyInput,
): Promise<PublicCompany> {
  const response = await apiPatch<PublicCompany>(`/companies/${companyId}`, input);
  if (!response.data) {
    throw new Error(response.message || 'Company update failed');
  }
  return normaliseCompany(response.data);
}

export async function updateCompanyStatutory(
  companyId: string,
  input: UpdateStatutoryInput,
): Promise<PublicCompany> {
  const response = await apiPatch<PublicCompany>(`/companies/${companyId}/statutory`, input);
  if (!response.data) {
    throw new Error(response.message || 'Statutory update failed');
  }
  return normaliseCompany(response.data);
}

export async function updateCompanyCapital(
  companyId: string,
  input: UpdateCapitalInput,
): Promise<PublicCompany> {
  const response = await apiPost<PublicCompany>(`/companies/${companyId}/capital`, input);
  if (!response.data) {
    throw new Error(response.message || 'Capital update failed');
  }
  return normaliseCompany(response.data);
}

export async function uploadCompanyLogo(companyId: string, file: File): Promise<PublicCompany> {
  const form = new FormData();
  form.append('file', file);
  const { data: response } = await apiClient.post<ApiResponse<PublicCompany>>(
    `/companies/${companyId}/logo`,
    form,
    { headers: { 'Content-Type': undefined } },
  );
  if (!response.data) {
    throw new Error(response.message || 'Logo upload failed');
  }
  return normaliseCompany(response.data);
}

export async function fetchCompanyAddressHistory(
  companyId: string,
  query: ListAddressHistoryQuery = {},
): Promise<PaginatedCompanyHistory<PublicAddressHistory>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const response = await apiGet<PublicAddressHistory[]>(`/companies/${companyId}/address-history`, {
    page,
    limit,
    addressType: query.addressType,
  });
  return {
    items: (response.data ?? []).map((item) => ({
      ...item,
      address: normaliseAddress(item.address),
      effectiveFrom: toIso(item.effectiveFrom) ?? '',
      effectiveTo: toIso(item.effectiveTo),
      changeReason: item.changeReason ?? null,
      createdAt: toIso(item.createdAt) ?? undefined,
    })),
    meta: readMeta(response.meta as Record<string, unknown> | undefined, page, limit),
  };
}

export async function fetchCompanyCapitalHistory(
  companyId: string,
  query: ListCapitalHistoryQuery = {},
): Promise<PaginatedCompanyHistory<PublicCapitalHistory>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const response = await apiGet<PublicCapitalHistory[]>(`/companies/${companyId}/capital-history`, {
    page,
    limit,
    capitalType: query.capitalType,
  });
  return {
    items: (response.data ?? []).map((item) => ({
      ...item,
      previousAmount: Number(item.previousAmount),
      newAmount: Number(item.newAmount),
      effectiveFrom: toIso(item.effectiveFrom) ?? '',
      changeReason: item.changeReason ?? null,
      reference: item.reference ?? null,
      createdAt: toIso(item.createdAt) ?? undefined,
    })),
    meta: readMeta(response.meta as Record<string, unknown> | undefined, page, limit),
  };
}
