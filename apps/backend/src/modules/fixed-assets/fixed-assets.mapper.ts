import type { Types } from 'mongoose';
import type {
  DepreciationMethod,
  FixedAssetCategory,
  FixedAssetStatus,
} from './schemas/fixed-asset.schema';
import type { FixedAssetDepreciationStatus } from './schemas/fixed-asset-depreciation.schema';

export type PublicFixedAsset = {
  id: string;
  assetNumber: string;
  companyId: string;
  projectId: string | null;
  name: string;
  category: FixedAssetCategory;
  capitalizationDate: Date;
  putToUseDate: Date;
  grossBlock: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  depreciationRatePercent: number | null;
  accumulatedDepreciation: number;
  netBlock: number;
  location: string | null;
  vendorId: string | null;
  purchaseReference: string | null;
  glAssetAccountId: string | null;
  glAccumDepAccountId: string | null;
  glDepExpenseAccountId: string | null;
  status: FixedAssetStatus;
  disposalDate: Date | null;
  disposalAmount: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicFixedAssetDepreciation = {
  id: string;
  depreciationNumber: string;
  assetId: string;
  companyId: string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  journalEntryId: string | null;
  status: FixedAssetDepreciationStatus;
  postedAt: Date | null;
  postedBy: string | null;
  postingNote: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type FixedAssetRegisterSummary = {
  assetId: string;
  assetNumber: string;
  name: string;
  status: FixedAssetStatus;
  grossBlock: number;
  accumulatedDepreciation: number;
  netBlock: number;
  depreciationCount: number;
  totalDepreciationPosted: number;
  lastDepreciationPeriod: { month: number; year: number } | null;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeNetBlock(
  grossBlock: number,
  accumulatedDepreciation: number,
): number {
  return roundMoney(Math.max(0, grossBlock - accumulatedDepreciation));
}

export function toPublicFixedAsset(row: {
  _id: Types.ObjectId | string;
  assetNumber: string;
  companyId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  name: string;
  category: FixedAssetCategory;
  capitalizationDate: Date;
  putToUseDate: Date;
  grossBlock: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  depreciationRatePercent?: number | null;
  accumulatedDepreciation: number;
  location?: string | null;
  vendorId?: Types.ObjectId | string | null;
  purchaseReference?: string | null;
  glAssetAccountId?: Types.ObjectId | string | null;
  glAccumDepAccountId?: Types.ObjectId | string | null;
  glDepExpenseAccountId?: Types.ObjectId | string | null;
  status: FixedAssetStatus;
  disposalDate?: Date | null;
  disposalAmount?: number | null;
  notes?: string | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicFixedAsset {
  const accumulatedDepreciation = row.accumulatedDepreciation ?? 0;
  return {
    id: String(row._id),
    assetNumber: row.assetNumber,
    companyId: String(row.companyId),
    projectId: oid(row.projectId),
    name: row.name,
    category: row.category,
    capitalizationDate: row.capitalizationDate,
    putToUseDate: row.putToUseDate,
    grossBlock: row.grossBlock,
    salvageValue: row.salvageValue ?? 0,
    usefulLifeMonths: row.usefulLifeMonths,
    depreciationMethod: row.depreciationMethod,
    depreciationRatePercent: row.depreciationRatePercent ?? null,
    accumulatedDepreciation,
    netBlock: computeNetBlock(row.grossBlock, accumulatedDepreciation),
    location: row.location ?? null,
    vendorId: oid(row.vendorId),
    purchaseReference: row.purchaseReference ?? null,
    glAssetAccountId: oid(row.glAssetAccountId),
    glAccumDepAccountId: oid(row.glAccumDepAccountId),
    glDepExpenseAccountId: oid(row.glDepExpenseAccountId),
    status: row.status,
    disposalDate: row.disposalDate ?? null,
    disposalAmount: row.disposalAmount ?? null,
    notes: row.notes ?? null,
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicFixedAssetDepreciation(row: {
  _id: Types.ObjectId | string;
  depreciationNumber: string;
  assetId: Types.ObjectId | string;
  companyId: Types.ObjectId | string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  journalEntryId?: Types.ObjectId | string | null;
  status: FixedAssetDepreciationStatus;
  postedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postingNote?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicFixedAssetDepreciation {
  return {
    id: String(row._id),
    depreciationNumber: row.depreciationNumber,
    assetId: String(row.assetId),
    companyId: String(row.companyId),
    periodMonth: row.periodMonth,
    periodYear: row.periodYear,
    amount: row.amount,
    journalEntryId: oid(row.journalEntryId),
    status: row.status,
    postedAt: row.postedAt ?? null,
    postedBy: oid(row.postedBy),
    postingNote: row.postingNote ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
