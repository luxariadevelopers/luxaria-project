import type { InvestorListRow, PublicInvestor } from './types';

/**
 * Strip bank (and other sensitive) fields before list rendering.
 * Even if the API payload includes `bankDetails`, the table never receives them.
 */
export function toInvestorListRow(investor: PublicInvestor): InvestorListRow {
  return {
    id: investor.id,
    investorCode: investor.investorCode,
    investorType: investor.investorType,
    legalName: investor.legalName,
    pan: investor.pan,
    gstin: investor.gstin,
    cin: investor.cin,
    directorId: investor.directorId,
    email: investor.contact?.email ?? null,
    phone: investor.contact?.phone ?? null,
    kycStatus: investor.kycStatus,
    status: investor.status,
    kycNotes: investor.kycNotes,
  };
}

/** Runtime guard used in tests — list row must not carry bank keys. */
export function listRowHasBankFields(row: object): boolean {
  return (
    'bankDetails' in row ||
    'accountNumber' in row ||
    'accountNumberLast4' in row ||
    'accountNumberEncrypted' in row ||
    'ifsc' in row
  );
}
