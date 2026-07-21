import type { Types } from 'mongoose';
import type { BoqUnit } from '../boq/schemas/boq.schema';
import type {
  ContractorTenderStatus,
  TenderCommercialBid,
  TenderCommercialBidLine,
  TenderNegotiationNote,
  TenderRecommendation,
  TenderTechnicalBid,
} from './schemas/contractor-tender.schema';

export type PublicTenderCommercialBidLine = {
  id: string;
  boqItemId: string | null;
  boqCode: string | null;
  description: string;
  unit: BoqUnit;
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
  submittedAt: Date;
  recordedBy: string;
};

export type PublicTenderCommercialBid = {
  id: string;
  contractorId: string;
  lines: PublicTenderCommercialBidLine[];
  totalAmount: number;
  validityDays: number | null;
  notes: string | null;
  submittedAt: Date;
  recordedBy: string;
};

export type PublicTenderNegotiationNote = {
  note: string;
  createdBy: string;
  createdAt: Date;
};

export type PublicTenderRecommendation = {
  recommendedContractorId: string;
  rationale: string;
  recommendedBy: string;
  recommendedAt: Date;
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
  invitationDate: Date | null;
  bidDeadline: Date | null;
  evaluationStartedAt: Date | null;
  awardedAt: Date | null;
  awardedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
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

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

function mapLine(
  line: TenderCommercialBidLine & { _id?: Types.ObjectId | string },
): PublicTenderCommercialBidLine {
  return {
    id: String(line._id ?? ''),
    boqItemId: oid(line.boqItemId),
    boqCode: line.boqCode ?? null,
    description: line.description,
    unit: line.unit,
    quantity: line.quantity,
    rate: line.rate,
    amount: line.amount,
  };
}

function mapTechnical(
  bid: TenderTechnicalBid & { _id?: Types.ObjectId | string },
): PublicTenderTechnicalBid {
  return {
    id: String(bid._id ?? ''),
    contractorId: String(bid.contractorId),
    complianceNotes: bid.complianceNotes ?? null,
    technicalScore: bid.technicalScore ?? null,
    documentIds: (bid.documentIds ?? []).map(String),
    submittedAt: bid.submittedAt,
    recordedBy: String(bid.recordedBy),
  };
}

function mapCommercial(
  bid: TenderCommercialBid & { _id?: Types.ObjectId | string },
): PublicTenderCommercialBid {
  return {
    id: String(bid._id ?? ''),
    contractorId: String(bid.contractorId),
    lines: (bid.lines ?? []).map(mapLine),
    totalAmount: bid.totalAmount,
    validityDays: bid.validityDays ?? null,
    notes: bid.notes ?? null,
    submittedAt: bid.submittedAt,
    recordedBy: String(bid.recordedBy),
  };
}

function mapNote(note: TenderNegotiationNote): PublicTenderNegotiationNote {
  return {
    note: note.note,
    createdBy: String(note.createdBy),
    createdAt: note.createdAt,
  };
}

function mapRecommendation(
  rec: TenderRecommendation | null | undefined,
): PublicTenderRecommendation | null {
  if (!rec) return null;
  return {
    recommendedContractorId: String(rec.recommendedContractorId),
    rationale: rec.rationale,
    recommendedBy: String(rec.recommendedBy),
    recommendedAt: rec.recommendedAt,
  };
}

export function toPublicContractorTender(row: {
  _id: Types.ObjectId | string;
  tenderNumber: string;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  title: string;
  description?: string | null;
  boqPackageIds?: Array<Types.ObjectId | string>;
  status: ContractorTenderStatus;
  invitedContractorIds?: Array<Types.ObjectId | string>;
  technicalBids?: Array<TenderTechnicalBid & { _id?: Types.ObjectId | string }>;
  commercialBids?: Array<
    TenderCommercialBid & { _id?: Types.ObjectId | string }
  >;
  negotiationNotes?: TenderNegotiationNote[];
  recommendation?: TenderRecommendation | null;
  awardedContractorId?: Types.ObjectId | string | null;
  awardedRateContractId?: Types.ObjectId | string | null;
  awardedAgreementId?: Types.ObjectId | string | null;
  invitationDate?: Date | null;
  bidDeadline?: Date | null;
  evaluationStartedAt?: Date | null;
  awardedAt?: Date | null;
  awardedBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancellationReason?: string | null;
  createdBy: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicContractorTender {
  return {
    id: String(row._id),
    tenderNumber: row.tenderNumber,
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    title: row.title,
    description: row.description ?? null,
    boqPackageIds: (row.boqPackageIds ?? []).map(String),
    status: row.status,
    invitedContractorIds: (row.invitedContractorIds ?? []).map(String),
    technicalBids: (row.technicalBids ?? []).map(mapTechnical),
    commercialBids: (row.commercialBids ?? []).map(mapCommercial),
    negotiationNotes: (row.negotiationNotes ?? []).map(mapNote),
    recommendation: mapRecommendation(row.recommendation),
    awardedContractorId: oid(row.awardedContractorId),
    awardedRateContractId: oid(row.awardedRateContractId),
    awardedAgreementId: oid(row.awardedAgreementId),
    invitationDate: row.invitationDate ?? null,
    bidDeadline: row.bidDeadline ?? null,
    evaluationStartedAt: row.evaluationStartedAt ?? null,
    awardedAt: row.awardedAt ?? null,
    awardedBy: oid(row.awardedBy),
    cancelledAt: row.cancelledAt ?? null,
    cancelledBy: oid(row.cancelledBy),
    cancellationReason: row.cancellationReason ?? null,
    createdBy: String(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function buildBidComparison(row: {
  _id: Types.ObjectId | string;
  tenderNumber: string;
  status: ContractorTenderStatus;
  invitedContractorIds?: Array<Types.ObjectId | string>;
  technicalBids?: Array<TenderTechnicalBid>;
  commercialBids?: Array<TenderCommercialBid>;
  recommendation?: TenderRecommendation | null;
  awardedContractorId?: Types.ObjectId | string | null;
}): PublicTenderBidComparison {
  const invited = new Set((row.invitedContractorIds ?? []).map(String));
  const techByContractor = new Map(
    (row.technicalBids ?? []).map((b) => [String(b.contractorId), b]),
  );
  const commercialByContractor = new Map(
    (row.commercialBids ?? []).map((b) => [String(b.contractorId), b]),
  );

  const contractorIds = new Set<string>([
    ...invited,
    ...techByContractor.keys(),
    ...commercialByContractor.keys(),
  ]);

  const ranked = [...commercialByContractor.entries()]
    .map(([contractorId, bid]) => ({
      contractorId,
      total: bid.totalAmount,
    }))
    .sort((a, b) => a.total - b.total);

  const rankMap = new Map<string, number>();
  ranked.forEach((entry, index) => {
    rankMap.set(entry.contractorId, index + 1);
  });

  const lowest = ranked[0] ?? null;
  const recommendedId = row.recommendation
    ? String(row.recommendation.recommendedContractorId)
    : null;
  const awardedId = row.awardedContractorId
    ? String(row.awardedContractorId)
    : null;

  const rows: PublicTenderBidComparisonRow[] = [...contractorIds].map(
    (contractorId) => {
      const tech = techByContractor.get(contractorId);
      const commercial = commercialByContractor.get(contractorId);
      return {
        contractorId,
        invited: invited.has(contractorId),
        hasTechnicalBid: Boolean(tech),
        hasCommercialBid: Boolean(commercial),
        technicalScore: tech?.technicalScore ?? null,
        commercialTotal: commercial?.totalAmount ?? null,
        rankByCommercial: rankMap.get(contractorId) ?? null,
        isRecommended: recommendedId === contractorId,
        isAwarded: awardedId === contractorId,
      };
    },
  );

  rows.sort((a, b) => {
    if (a.rankByCommercial == null && b.rankByCommercial == null) return 0;
    if (a.rankByCommercial == null) return 1;
    if (b.rankByCommercial == null) return -1;
    return a.rankByCommercial - b.rankByCommercial;
  });

  return {
    tenderId: String(row._id),
    tenderNumber: row.tenderNumber,
    status: row.status,
    lowestCommercialTotal: lowest?.total ?? null,
    lowestCommercialContractorId: lowest?.contractorId ?? null,
    rows,
  };
}
