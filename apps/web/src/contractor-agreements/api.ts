import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  AmendContractorAgreementInput,
  CreateContractorAgreementInput,
  ListContractorAgreementsQuery,
  ListExpiryAlertsQuery,
  PaginatedContractorAgreements,
  PaginatedExpiryAlerts,
  PublicContractorAgreement,
  PublicExpiryAlert,
  UpdateContractorAgreementInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseAgreement(
  row: PublicContractorAgreement,
): PublicContractorAgreement {
  return {
    ...row,
    startDate: toIso(row.startDate) ?? row.startDate,
    endDate: toIso(row.endDate) ?? row.endDate,
    submittedAt: toIso(row.submittedAt),
    approvedAt: toIso(row.approvedAt),
    rejectedAt: toIso(row.rejectedAt),
    terminatedAt: toIso(row.terminatedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedContractorAgreements['meta'] {
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

/** `GET /contractor-agreements` — `contractor_agreement.view` */
export async function fetchContractorAgreements(
  query: ListContractorAgreementsQuery = {},
): Promise<PaginatedContractorAgreements> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicContractorAgreement[]>('/contractor-agreements', {
    page,
    limit,
    projectId: query.projectId,
    contractorId: query.contractorId,
    status: query.status,
    agreementNumber: query.agreementNumber,
  });
  return {
    items: (res.data ?? []).map(normaliseAgreement),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /contractor-agreements/:id` — `contractor_agreement.view` */
export async function fetchContractorAgreement(
  id: string,
): Promise<PublicContractorAgreement> {
  const res = await apiGet<PublicContractorAgreement>(
    `/contractor-agreements/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor agreement unavailable');
  }
  return normaliseAgreement(res.data);
}

/** `GET /contractor-agreements/by-number/:agreementNumber/versions` */
export async function fetchAgreementVersions(
  agreementNumber: string,
  projectId?: string,
): Promise<PublicContractorAgreement[]> {
  const res = await apiGet<PublicContractorAgreement[]>(
    `/contractor-agreements/by-number/${encodeURIComponent(agreementNumber)}/versions`,
    { projectId },
  );
  return (res.data ?? []).map(normaliseAgreement);
}

/** `POST /contractor-agreements` — `contractor_agreement.manage` */
export async function createContractorAgreement(
  input: CreateContractorAgreementInput,
): Promise<PublicContractorAgreement> {
  const res = await apiPost<PublicContractorAgreement>(
    '/contractor-agreements',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Create agreement failed');
  }
  return normaliseAgreement(res.data);
}

/** `PATCH /contractor-agreements/:id` — `contractor_agreement.manage` */
export async function updateContractorAgreement(
  id: string,
  input: UpdateContractorAgreementInput,
): Promise<PublicContractorAgreement> {
  const res = await apiPatch<PublicContractorAgreement>(
    `/contractor-agreements/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update agreement failed');
  }
  return normaliseAgreement(res.data);
}

/** `POST /contractor-agreements/:id/amend` — `contractor_agreement.manage` */
export async function amendContractorAgreement(
  id: string,
  input: AmendContractorAgreementInput = {},
): Promise<PublicContractorAgreement> {
  const res = await apiPost<PublicContractorAgreement>(
    `/contractor-agreements/${encodeURIComponent(id)}/amend`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Amend agreement failed');
  }
  return normaliseAgreement(res.data);
}

/** `POST /contractor-agreements/:id/submit` — `contractor_agreement.manage` */
export async function submitContractorAgreement(
  id: string,
): Promise<PublicContractorAgreement> {
  const res = await apiPost<PublicContractorAgreement>(
    `/contractor-agreements/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit agreement failed');
  }
  return normaliseAgreement(res.data);
}

/** `POST /contractor-agreements/:id/approve` — `contractor_agreement.approve` */
export async function approveContractorAgreement(
  id: string,
  comment?: string | null,
): Promise<PublicContractorAgreement> {
  const res = await apiPost<PublicContractorAgreement>(
    `/contractor-agreements/${encodeURIComponent(id)}/approve`,
    comment ? { comment } : {},
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve agreement failed');
  }
  return normaliseAgreement(res.data);
}

/** `POST /contractor-agreements/:id/reject` — `contractor_agreement.approve` */
export async function rejectContractorAgreement(
  id: string,
  reason: string,
): Promise<PublicContractorAgreement> {
  const res = await apiPost<PublicContractorAgreement>(
    `/contractor-agreements/${encodeURIComponent(id)}/reject`,
    { reason },
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject agreement failed');
  }
  return normaliseAgreement(res.data);
}

/** `POST /contractor-agreements/:id/terminate` — `contractor_agreement.manage` */
export async function terminateContractorAgreement(
  id: string,
  reason: string,
): Promise<PublicContractorAgreement> {
  const res = await apiPost<PublicContractorAgreement>(
    `/contractor-agreements/${encodeURIComponent(id)}/terminate`,
    { reason },
  );
  if (!res.data) {
    throw new Error(res.message || 'Terminate agreement failed');
  }
  return normaliseAgreement(res.data);
}

/** `GET /contractor-agreements/expiry-alerts` — `contractor_agreement.view` */
export async function fetchExpiryAlerts(
  query: ListExpiryAlertsQuery = {},
): Promise<PaginatedExpiryAlerts> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicExpiryAlert[]>(
    '/contractor-agreements/expiry-alerts',
    {
      page,
      limit,
      projectId: query.projectId,
      alertType: query.alertType,
      unacknowledgedOnly: query.unacknowledgedOnly,
    },
  );
  return {
    items: (res.data ?? []).map((row) => ({
      ...row,
      endDate: toIso(row.endDate) ?? row.endDate,
      acknowledgedAt: toIso(row.acknowledgedAt),
    })),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `POST /contractor-agreements/expiry-alerts/:alertId/acknowledge` */
export async function acknowledgeExpiryAlert(
  alertId: string,
): Promise<PublicExpiryAlert> {
  const res = await apiPost<PublicExpiryAlert>(
    `/contractor-agreements/expiry-alerts/${encodeURIComponent(alertId)}/acknowledge`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Acknowledge alert failed');
  }
  return {
    ...res.data,
    endDate: toIso(res.data.endDate) ?? res.data.endDate,
    acknowledgedAt: toIso(res.data.acknowledgedAt),
  };
}
