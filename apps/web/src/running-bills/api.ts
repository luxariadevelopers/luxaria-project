import { apiGet, apiPatch, apiPost } from '@/api/client';
import { searchContractors } from '@/api/searchLists';
import {
  ContractorAgreementStatus,
  fetchContractorAgreements,
  type PublicContractorAgreement,
} from '@/contractor-agreements';
import {
  WorkMeasurementStatus,
  fetchWorkMeasurements,
  type PublicWorkMeasurement,
} from '@/work-measurements';
import type {
  ContractorAgreementOption,
  ContractorOption,
  CreateContractorBillInput,
  EligibleWorkMeasurement,
  ListContractorBillsQuery,
  PaginatedContractorBills,
  PostContractorBillInput,
  PublicContractorBill,
  RejectContractorBillInput,
  UpdateContractorBillInput,
  WorkflowNoteInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toDateOnly(value: unknown): string {
  const iso = toIso(value);
  if (!iso) return '';
  return iso.slice(0, 10);
}

function normaliseBill(row: PublicContractorBill): PublicContractorBill {
  return {
    ...row,
    billingPeriod: {
      from: toDateOnly(row.billingPeriod?.from) || String(row.billingPeriod?.from ?? ''),
      to: toDateOnly(row.billingPeriod?.to) || String(row.billingPeriod?.to ?? ''),
    },
    measurements: (row.measurements ?? []).map((line) => ({ ...line })),
    approvedExtras: Number(row.approvedExtras ?? 0),
    priceEscalation: Number(row.priceEscalation ?? 0),
    equipmentRecovery: Number(row.equipmentRecovery ?? 0),
    labourRecovery: Number(row.labourRecovery ?? 0),
    gst: Number(row.gst ?? 0),
    paidAmount: Number(row.paidAmount ?? 0),
    remainingPayable: Number(row.remainingPayable ?? 0),
    paymentCertificateNumber: row.paymentCertificateNumber ?? null,
    statusAlias: row.statusAlias ?? row.status,
    claimedAt: toIso(row.claimedAt),
    engineerVerifiedAt: toIso(row.engineerVerifiedAt),
    pmCertifiedAt: toIso(row.pmCertifiedAt),
    financeVerifiedAt: toIso(row.financeVerifiedAt),
    directorApprovedAt: toIso(row.directorApprovedAt),
    postedAt: toIso(row.postedAt),
    paidAt: toIso(row.paidAt),
    rejectedAt: toIso(row.rejectedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedContractorBills['meta'] {
  if (!meta) return null;
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}

const BASE = '/contractor-bills';

/** `GET /contractor-bills` — Nest `running_bill.view` */
export async function fetchContractorBills(
  query: ListContractorBillsQuery = {},
): Promise<PaginatedContractorBills> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicContractorBill[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    contractorId: query.contractorId,
    agreementId: query.agreementId,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseBill),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /contractor-bills/:id` — Nest `running_bill.view` */
export async function fetchContractorBill(
  id: string,
): Promise<PublicContractorBill> {
  const res = await apiGet<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Running bill unavailable');
  }
  return normaliseBill(res.data);
}

/** `POST /contractor-bills` — Nest `running_bill.create` */
export async function createContractorBill(
  input: CreateContractorBillInput,
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Running bill create failed');
  }
  return normaliseBill(res.data);
}

/** `PATCH /contractor-bills/:id` — Nest `running_bill.create` */
export async function updateContractorBill(
  id: string,
  input: UpdateContractorBillInput,
): Promise<PublicContractorBill> {
  const res = await apiPatch<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Running bill update failed');
  }
  return normaliseBill(res.data);
}

/** `POST /contractor-bills/:id/submit-claim` — Nest `running_bill.create` */
export async function submitContractorBillClaim(
  id: string,
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/submit-claim`,
    {},
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit claim failed');
  }
  return normaliseBill(res.data);
}

/** `POST …/engineer-verify` — Nest `running_bill.verify` */
export async function engineerVerifyContractorBill(
  id: string,
  input: WorkflowNoteInput = {},
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/engineer-verify`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Engineer verification failed');
  }
  return normaliseBill(res.data);
}

/** `POST …/pm-certify` — Nest `running_bill.certify` */
export async function pmCertifyContractorBill(
  id: string,
  input: WorkflowNoteInput = {},
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/pm-certify`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'PM certification failed');
  }
  return normaliseBill(res.data);
}

/** `POST …/finance-verify` — Nest `running_bill.finance_verify` */
export async function financeVerifyContractorBill(
  id: string,
  input: WorkflowNoteInput = {},
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/finance-verify`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Finance verification failed');
  }
  return normaliseBill(res.data);
}

/** `POST …/director-approve` — Nest `running_bill.approve` */
export async function directorApproveContractorBill(
  id: string,
  input: WorkflowNoteInput = {},
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/director-approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Director approval failed');
  }
  return normaliseBill(res.data);
}

/** `POST …/post` — Nest `running_bill.post` (payment certificate optional) */
export async function postContractorBill(
  id: string,
  input: PostContractorBillInput = {},
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/post`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Post failed');
  }
  return normaliseBill(res.data);
}

/** `POST …/mark-paid` — Nest `running_bill.pay` */
export async function markContractorBillPaid(
  id: string,
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/mark-paid`,
    {},
  );
  if (!res.data) {
    throw new Error(res.message || 'Mark paid failed');
  }
  return normaliseBill(res.data);
}

/** `POST …/close` — Nest `running_bill.pay` */
export async function closeContractorBill(
  id: string,
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/close`,
    {},
  );
  if (!res.data) {
    throw new Error(res.message || 'Close failed');
  }
  return normaliseBill(res.data);
}

/** `POST …/reject` — Nest `running_bill.verify` */
export async function rejectContractorBill(
  id: string,
  input: RejectContractorBillInput,
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject failed');
  }
  return normaliseBill(res.data);
}

/** `POST …/cancel` — Nest `running_bill.create` */
export async function cancelContractorBill(
  id: string,
): Promise<PublicContractorBill> {
  const res = await apiPost<PublicContractorBill>(
    `${BASE}/${encodeURIComponent(id)}/cancel`,
    {},
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel failed');
  }
  return normaliseBill(res.data);
}

function toEligibleMeasurement(
  row: PublicWorkMeasurement,
): EligibleWorkMeasurement {
  return {
    id: row.id,
    measurementNumber: row.measurementNumber,
    projectId: row.projectId,
    contractorId: row.contractorId,
    boqItemId: row.boqItemId,
    boqCode: row.boqCode,
    location: row.location,
    measurementDate: toDateOnly(row.measurementDate) || row.measurementDate,
    previousQuantity: Number(row.previousQuantity ?? 0),
    currentQuantity: Number(row.currentQuantity ?? 0),
    cumulativeQuantity: Number(row.cumulativeQuantity ?? 0),
    unit: row.unit,
    status: row.status,
    boqPlannedQuantity: Number(row.boqPlannedQuantity ?? 0),
  };
}

function toAgreementOption(
  row: PublicContractorAgreement,
): ContractorAgreementOption {
  return {
    id: row.id,
    agreementNumber: row.agreementNumber,
    version: row.version,
    contractorId: row.contractorId,
    projectId: row.projectId,
    workScope: row.workScope,
    status: row.status,
    retentionPercentage: Number(row.retentionPercentage ?? 0),
    advance: row.advance ?? { amount: 0, terms: null },
    recoveryPlan: row.recoveryPlan ?? {
      method: null,
      percentPerBill: null,
      notes: null,
    },
    boqItems: (row.boqItems ?? []).map((line) => ({
      id: line.id,
      boqItemId: line.boqItemId,
      boqCode: line.boqCode,
      description: line.description,
      unit: line.unit,
      agreedQuantity: line.agreedQuantity,
      agreedRate: line.agreedRate,
      agreedValue: line.agreedValue,
    })),
  };
}

/**
 * Eligible measurements for a claim — Nest has no dedicated endpoint.
 * Uses `GET /work-measurements` with `status=verified` + period dates.
 * Permission: `measurement.view`.
 */
export async function fetchEligibleMeasurements(query: {
  projectId: string;
  contractorId: string;
  fromDate: string;
  toDate: string;
}): Promise<EligibleWorkMeasurement[]> {
  const res = await fetchWorkMeasurements({
    page: 1,
    limit: 100,
    projectId: query.projectId,
    contractorId: query.contractorId,
    status: WorkMeasurementStatus.Verified,
    fromDate: query.fromDate,
    toDate: query.toDate,
  });
  return res.items.map(toEligibleMeasurement);
}

/** `GET /contractor-agreements` — Nest `contractor_agreement.view` */
export async function fetchActiveAgreements(query: {
  projectId: string;
  contractorId: string;
}): Promise<ContractorAgreementOption[]> {
  const res = await fetchContractorAgreements({
    page: 1,
    limit: 100,
    projectId: query.projectId,
    contractorId: query.contractorId,
    status: ContractorAgreementStatus.Active,
  });
  return res.items.map(toAgreementOption);
}

/** `GET /contractors?search=` — Nest `contractor.view` */
export async function fetchContractorOptions(
  search = '',
): Promise<ContractorOption[]> {
  const rows = await searchContractors({
    search: search.trim(),
    limit: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    contractorCode: row.contractorCode,
    legalName: row.legalName,
    status: row.status,
  }));
}

/**
 * Collect measurement IDs already claimed on non-cancelled/rejected bills
 * for soft duplicate prevention in the create form.
 */
export async function fetchBilledMeasurementIds(query: {
  projectId: string;
  contractorId?: string;
}): Promise<Set<string>> {
  const res = await fetchContractorBills({
    page: 1,
    limit: 100,
    projectId: query.projectId,
    contractorId: query.contractorId,
  });
  const ids = new Set<string>();
  for (const bill of res.items) {
    if (bill.status === 'cancelled' || bill.status === 'rejected') continue;
    for (const line of bill.measurements) {
      ids.add(line.measurementId);
    }
  }
  return ids;
}
