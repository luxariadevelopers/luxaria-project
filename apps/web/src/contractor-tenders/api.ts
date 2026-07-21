import { apiGet, apiPost } from '@/api/client';

export type ContractorTenderStatus =
  | 'draft'
  | 'invited'
  | 'bidding'
  | 'under_evaluation'
  | 'awarded'
  | 'cancelled';

export type PublicTenderCommercialBidLine = {
  id: string;
  boqItemId: string | null;
  boqCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type PublicTenderTechnicalBid = {
  id: string;
  contractorId: string;
  complianceNotes: string | null;
  technicalScore: number | null;
  documentIds: string[];
  submittedAt: string;
  recordedBy: string;
};

export type PublicTenderCommercialBid = {
  id: string;
  contractorId: string;
  lines: PublicTenderCommercialBidLine[];
  totalAmount: number;
  validityDays: number | null;
  notes: string | null;
  submittedAt: string;
  recordedBy: string;
};

export type PublicTenderNegotiationNote = {
  note: string;
  createdBy: string;
  createdAt: string;
};

export type PublicTenderRecommendation = {
  recommendedContractorId: string;
  rationale: string;
  recommendedBy: string;
  recommendedAt: string;
};

export type PublicContractorTender = {
  id: string;
  tenderNumber: string;
  projectId: string;
  siteId: string | null;
  title: string;
  description: string | null;
  boqPackageIds: string[];
  status: ContractorTenderStatus;
  invitedContractorIds: string[];
  technicalBids: PublicTenderTechnicalBid[];
  commercialBids: PublicTenderCommercialBid[];
  negotiationNotes: PublicTenderNegotiationNote[];
  recommendation: PublicTenderRecommendation | null;
  awardedContractorId: string | null;
  awardedRateContractId: string | null;
  awardedAgreementId: string | null;
  invitationDate: string | null;
  bidDeadline: string | null;
  evaluationStartedAt: string | null;
  awardedAt: string | null;
  awardedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicTenderBidComparisonRow = {
  contractorId: string;
  invited: boolean;
  hasTechnicalBid: boolean;
  hasCommercialBid: boolean;
  technicalScore: number | null;
  commercialTotal: number | null;
  rankByCommercial: number | null;
  isRecommended: boolean;
  isAwarded: boolean;
};

export type PublicTenderBidComparison = {
  tenderId: string;
  tenderNumber: string;
  status: ContractorTenderStatus;
  lowestCommercialTotal: number | null;
  lowestCommercialContractorId: string | null;
  rows: PublicTenderBidComparisonRow[];
};

export type TenderCompareResult = {
  tender: PublicContractorTender;
  comparison: PublicTenderBidComparison;
};

export type ListContractorTendersQuery = {
  projectId?: string;
  siteId?: string;
  status?: ContractorTenderStatus;
  awardedContractorId?: string;
  page?: number;
  limit?: number;
};

export type CreateContractorTenderInput = {
  projectId: string;
  siteId?: string | null;
  title: string;
  description?: string | null;
  boqPackageIds?: string[];
  bidDeadline?: string | null;
};

export type InviteContractorsInput = {
  contractorIds: string[];
  bidDeadline?: string | null;
};

export type RecordBidInput = {
  contractorId: string;
  technical?: {
    complianceNotes?: string | null;
    technicalScore?: number | null;
    documentIds?: string[];
  };
  commercial?: {
    lines: Array<{
      boqItemId?: string | null;
      boqCode?: string | null;
      description: string;
      unit: string;
      quantity: number;
      rate: number;
    }>;
    validityDays?: number | null;
    notes?: string | null;
  };
};

export type RecommendTenderInput = {
  recommendedContractorId: string;
  rationale: string;
};

export type AwardTenderInput = {
  awardedContractorId: string;
  awardedRateContractId?: string | null;
  awardedAgreementId?: string | null;
};

const BASE = '/contractor-tenders';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseBid(row: PublicTenderTechnicalBid): PublicTenderTechnicalBid {
  return {
    ...row,
    id: String(row.id),
    contractorId: String(row.contractorId),
    complianceNotes: row.complianceNotes ?? null,
    technicalScore: row.technicalScore ?? null,
    documentIds: (row.documentIds ?? []).map(String),
    submittedAt: toIso(row.submittedAt) ?? String(row.submittedAt),
    recordedBy: String(row.recordedBy),
  };
}

function normaliseCommercial(
  row: PublicTenderCommercialBid,
): PublicTenderCommercialBid {
  return {
    ...row,
    id: String(row.id),
    contractorId: String(row.contractorId),
    lines: (row.lines ?? []).map((line) => ({
      ...line,
      id: String(line.id),
      boqItemId: line.boqItemId == null ? null : String(line.boqItemId),
      boqCode: line.boqCode ?? null,
    })),
    validityDays: row.validityDays ?? null,
    notes: row.notes ?? null,
    submittedAt: toIso(row.submittedAt) ?? String(row.submittedAt),
    recordedBy: String(row.recordedBy),
  };
}

function normalise(row: PublicContractorTender): PublicContractorTender {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    siteId: row.siteId == null ? null : String(row.siteId),
    description: row.description ?? null,
    boqPackageIds: (row.boqPackageIds ?? []).map(String),
    invitedContractorIds: (row.invitedContractorIds ?? []).map(String),
    technicalBids: (row.technicalBids ?? []).map(normaliseBid),
    commercialBids: (row.commercialBids ?? []).map(normaliseCommercial),
    negotiationNotes: (row.negotiationNotes ?? []).map((n) => ({
      note: n.note,
      createdBy: String(n.createdBy),
      createdAt: toIso(n.createdAt) ?? String(n.createdAt),
    })),
    recommendation: row.recommendation
      ? {
          recommendedContractorId: String(
            row.recommendation.recommendedContractorId,
          ),
          rationale: row.recommendation.rationale,
          recommendedBy: String(row.recommendation.recommendedBy),
          recommendedAt:
            toIso(row.recommendation.recommendedAt) ??
            String(row.recommendation.recommendedAt),
        }
      : null,
    awardedContractorId:
      row.awardedContractorId == null
        ? null
        : String(row.awardedContractorId),
    awardedRateContractId:
      row.awardedRateContractId == null
        ? null
        : String(row.awardedRateContractId),
    awardedAgreementId:
      row.awardedAgreementId == null ? null : String(row.awardedAgreementId),
    invitationDate: toIso(row.invitationDate),
    bidDeadline: toIso(row.bidDeadline),
    evaluationStartedAt: toIso(row.evaluationStartedAt),
    awardedAt: toIso(row.awardedAt),
    awardedBy: row.awardedBy == null ? null : String(row.awardedBy),
    cancelledAt: toIso(row.cancelledAt),
    cancelledBy: row.cancelledBy == null ? null : String(row.cancelledBy),
    cancellationReason: row.cancellationReason ?? null,
    createdBy: String(row.createdBy),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /contractor-tenders` — `tender.view` */
export async function fetchContractorTenders(
  query: ListContractorTendersQuery = {},
): Promise<PublicContractorTender[]> {
  const res = await apiGet<PublicContractorTender[]>(BASE, {
    projectId: query.projectId,
    siteId: query.siteId,
    status: query.status,
    awardedContractorId: query.awardedContractorId,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return (res.data ?? []).map(normalise);
}

/** `GET /contractor-tenders/:id` — `tender.view` */
export async function fetchContractorTender(
  id: string,
): Promise<PublicContractorTender> {
  const res = await apiGet<PublicContractorTender>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor tender unavailable');
  }
  return normalise(res.data);
}

/** `POST /contractor-tenders` — `tender.manage` */
export async function createContractorTender(
  input: CreateContractorTenderInput,
): Promise<PublicContractorTender> {
  const res = await apiPost<PublicContractorTender>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create tender failed');
  }
  return normalise(res.data);
}

/** `POST /contractor-tenders/:id/invite` — `tender.manage` */
export async function inviteContractors(
  id: string,
  input: InviteContractorsInput,
): Promise<PublicContractorTender> {
  const res = await apiPost<PublicContractorTender>(
    `${BASE}/${encodeURIComponent(id)}/invite`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Invite failed');
  }
  return normalise(res.data);
}

/** `POST /contractor-tenders/:id/bids` — `tender.manage` */
export async function recordTenderBid(
  id: string,
  input: RecordBidInput,
): Promise<PublicContractorTender> {
  const res = await apiPost<PublicContractorTender>(
    `${BASE}/${encodeURIComponent(id)}/bids`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Record bid failed');
  }
  return normalise(res.data);
}

/** `POST /contractor-tenders/:id/compare` — `tender.view` */
export async function compareTenderBids(
  id: string,
): Promise<TenderCompareResult> {
  const res = await apiPost<TenderCompareResult>(
    `${BASE}/${encodeURIComponent(id)}/compare`,
    {},
  );
  if (!res.data) {
    throw new Error(res.message || 'Compare failed');
  }
  return {
    tender: normalise(res.data.tender),
    comparison: {
      ...res.data.comparison,
      tenderId: String(res.data.comparison.tenderId),
      rows: (res.data.comparison.rows ?? []).map((r) => ({
        ...r,
        contractorId: String(r.contractorId),
      })),
      lowestCommercialContractorId:
        res.data.comparison.lowestCommercialContractorId == null
          ? null
          : String(res.data.comparison.lowestCommercialContractorId),
    },
  };
}

/** `POST /contractor-tenders/:id/recommend` — `tender.manage` */
export async function recommendTender(
  id: string,
  input: RecommendTenderInput,
): Promise<PublicContractorTender> {
  const res = await apiPost<PublicContractorTender>(
    `${BASE}/${encodeURIComponent(id)}/recommend`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Recommend failed');
  }
  return normalise(res.data);
}

/** `POST /contractor-tenders/:id/award` — `tender.award` */
export async function awardTender(
  id: string,
  input: AwardTenderInput,
): Promise<PublicContractorTender> {
  const res = await apiPost<PublicContractorTender>(
    `${BASE}/${encodeURIComponent(id)}/award`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Award failed');
  }
  return normalise(res.data);
}

/** `POST /contractor-tenders/:id/cancel` — `tender.manage` */
export async function cancelTender(
  id: string,
  reason?: string | null,
): Promise<PublicContractorTender> {
  const res = await apiPost<PublicContractorTender>(
    `${BASE}/${encodeURIComponent(id)}/cancel`,
    { reason: reason ?? null },
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel failed');
  }
  return normalise(res.data);
}
