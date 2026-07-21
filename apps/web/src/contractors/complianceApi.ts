import { apiGet } from '@/api/client';

export type ComplianceExpiringRow = {
  contractorId: string;
  contractorCode: string;
  legalName: string;
  status: string;
  labourLicence: {
    licenceNumber: string | null;
    validTo: string | null;
    isValid: boolean | null;
    daysRemaining: number | null;
  };
  insurance: {
    policyNumber: string | null;
    validTo: string | null;
    isValid: boolean | null;
    daysRemaining: number | null;
  };
};

export type ComplianceExpiringResult = {
  withinDays: number;
  asOf: string;
  rows: ComplianceExpiringRow[];
};

/** `GET /contractors/compliance/expiring` — `contractor.view` */
export async function fetchComplianceExpiring(
  withinDays = 30,
): Promise<ComplianceExpiringResult> {
  const res = await apiGet<ComplianceExpiringResult>(
    '/contractors/compliance/expiring',
    { withinDays },
  );
  if (!res.data) {
    throw new Error(res.message || 'Compliance list unavailable');
  }
  return {
    ...res.data,
    rows: res.data.rows ?? [],
  };
}
