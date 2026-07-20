import type { VendorListRow, VendorStatus, VendorVerificationStatus } from './types';

export type VendorClientFilters = {
  search?: string;
  status?: VendorStatus | '';
  verificationStatus?: VendorVerificationStatus | '';
  materialCategory?: string;
};

/**
 * Client-side filter mirror for unit tests (list UI uses Nest query params).
 * Used to assert blocked / category / search behaviour without hitting the API.
 */
export function applyClientFilters(
  rows: readonly VendorListRow[],
  filters: VendorClientFilters,
): VendorListRow[] {
  const search = filters.search?.trim().toLowerCase() ?? '';
  const category = filters.materialCategory?.trim().toLowerCase() ?? '';

  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) {
      return false;
    }
    if (
      filters.verificationStatus &&
      row.verificationStatus !== filters.verificationStatus
    ) {
      return false;
    }
    if (category && !row.materialCategories.includes(category)) {
      return false;
    }
    if (!search) return true;
    const haystack = [
      row.vendorCode,
      row.legalName,
      row.tradeName,
      row.pan,
      row.gstin,
      row.email,
      row.phone,
      row.contactPerson,
      ...row.materialCategories,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });
}
