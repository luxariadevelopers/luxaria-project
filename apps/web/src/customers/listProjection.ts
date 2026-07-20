import type { CustomerListRow, PublicCustomer } from './types';

/**
 * Strip full Aadhaar (and joint Aadhaar) before list rendering.
 * Even if Nest returns decrypted `aadhaar` for managers, the table never receives it.
 */
export function toCustomerListRow(customer: PublicCustomer): CustomerListRow {
  const joint = customer.jointApplicant;
  const hasJointApplicant = Boolean(
    joint?.fullName ||
      joint?.pan ||
      joint?.aadhaarReference ||
      joint?.phone ||
      joint?.email,
  );

  return {
    id: customer.id,
    customerCode: customer.customerCode,
    fullName: customer.fullName,
    pan: customer.pan,
    aadhaarReference: customer.aadhaarReference,
    email: customer.contact?.email ?? null,
    phone: customer.contact?.phone ?? null,
    fundingType: customer.fundingType,
    loanBank: customer.loanBank,
    kycStatus: customer.kycStatus,
    status: customer.status,
    kycNotes: customer.kycNotes,
    hasJointApplicant,
  };
}

/** Runtime guard used in tests — list row must not carry full Aadhaar keys. */
export function listRowHasFullAadhaarFields(row: object): boolean {
  return (
    'aadhaar' in row ||
    'aadhaarEncrypted' in row ||
    'jointApplicant' in row
  );
}
