import type { PublicVendor, VendorListRow } from './types';

/**
 * Strip bank (and other sensitive) fields before list rendering.
 * Even if the API payload includes `bankDetails` / decrypted account numbers,
 * the table never receives them.
 */
export function toVendorListRow(vendor: PublicVendor): VendorListRow {
  return {
    id: vendor.id,
    vendorCode: vendor.vendorCode,
    legalName: vendor.legalName,
    tradeName: vendor.tradeName,
    gstin: vendor.gstin,
    pan: vendor.pan,
    email: vendor.contact?.email ?? null,
    phone: vendor.contact?.phone ?? null,
    contactPerson: vendor.contact?.contactPerson ?? null,
    materialCategories: [...(vendor.materialCategories ?? [])],
    paymentTerms: vendor.paymentTerms,
    rating: vendor.rating,
    verificationStatus: vendor.verificationStatus,
    status: vendor.status,
    blockReason: vendor.blockReason,
  };
}

/** Runtime guard used in tests — list row must not carry bank keys. */
export function listRowHasBankFields(row: object): boolean {
  return (
    'bankDetails' in row ||
    'accountNumber' in row ||
    'accountNumberLast4' in row ||
    'accountNumberEncrypted' in row ||
    'ifsc' in row ||
    'bankName' in row
  );
}
