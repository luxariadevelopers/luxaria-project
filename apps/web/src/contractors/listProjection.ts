import type { ContractorListRow, PublicContractor } from './types';

export function toContractorListRow(
  contractor: PublicContractor,
): ContractorListRow {
  return {
    id: contractor.id,
    contractorCode: contractor.contractorCode,
    legalName: contractor.legalName,
    tradeName: contractor.tradeName,
    contractorType: contractor.contractorType,
    gstin: contractor.gstin,
    pan: contractor.pan,
    email: contractor.contact?.email ?? null,
    phone: contractor.contact?.phone ?? null,
    contactPerson: contractor.contact?.contactPerson ?? null,
    workCategories: [...(contractor.workCategories ?? [])],
    rating: contractor.rating,
    verificationStatus: contractor.verificationStatus,
    status: contractor.status,
    blockReason: contractor.blockReason,
  };
}
