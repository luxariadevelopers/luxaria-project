import type { Types } from 'mongoose';
import type { ProcurementMasterStatus } from './schemas/procurement-master-status';

type IdLike = { _id: Types.ObjectId | string; createdAt?: Date; updatedAt?: Date };

export type PublicCatalogItem = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  status: ProcurementMasterStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicPaymentTerm = PublicCatalogItem & { days: number };
export type PublicDeliveryTerm = PublicCatalogItem & {
  description: string | null;
};
export type PublicTaxRule = PublicCatalogItem & { gstPercent: number };

export type PublicPreferredVendor = {
  id: string;
  companyId: string;
  vendorId: string;
  materialId: string | null;
  materialCategoryCode: string | null;
  projectId: string | null;
  priority: number;
  notes: string | null;
  status: ProcurementMasterStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicVendorPriceList = {
  id: string;
  companyId: string;
  vendorId: string;
  materialId: string;
  unitPrice: number;
  currency: string;
  taxRuleId: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: ProcurementMasterStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicCatalogItem(row: IdLike & {
  companyId: Types.ObjectId | string;
  code: string;
  name: string;
  status: ProcurementMasterStatus;
}): PublicCatalogItem {
  return {
    id: String(row._id),
    companyId: String(row.companyId),
    code: row.code,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicPaymentTerm(row: IdLike & {
  companyId: Types.ObjectId | string;
  code: string;
  name: string;
  days: number;
  status: ProcurementMasterStatus;
}): PublicPaymentTerm {
  return { ...toPublicCatalogItem(row), days: row.days };
}

export function toPublicDeliveryTerm(row: IdLike & {
  companyId: Types.ObjectId | string;
  code: string;
  name: string;
  description?: string | null;
  status: ProcurementMasterStatus;
}): PublicDeliveryTerm {
  return {
    ...toPublicCatalogItem(row),
    description: row.description ?? null,
  };
}

export function toPublicTaxRule(row: IdLike & {
  companyId: Types.ObjectId | string;
  code: string;
  name: string;
  gstPercent: number;
  status: ProcurementMasterStatus;
}): PublicTaxRule {
  return { ...toPublicCatalogItem(row), gstPercent: row.gstPercent };
}

export function toPublicPreferredVendor(row: IdLike & {
  companyId: Types.ObjectId | string;
  vendorId: Types.ObjectId | string;
  materialId?: Types.ObjectId | string | null;
  materialCategoryCode?: string | null;
  projectId?: Types.ObjectId | string | null;
  priority: number;
  notes?: string | null;
  status: ProcurementMasterStatus;
}): PublicPreferredVendor {
  return {
    id: String(row._id),
    companyId: String(row.companyId),
    vendorId: String(row.vendorId),
    materialId: row.materialId ? String(row.materialId) : null,
    materialCategoryCode: row.materialCategoryCode ?? null,
    projectId: row.projectId ? String(row.projectId) : null,
    priority: row.priority,
    notes: row.notes ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicVendorPriceList(row: IdLike & {
  companyId: Types.ObjectId | string;
  vendorId: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  unitPrice: number;
  currency: string;
  taxRuleId?: Types.ObjectId | string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  status: ProcurementMasterStatus;
}): PublicVendorPriceList {
  return {
    id: String(row._id),
    companyId: String(row.companyId),
    vendorId: String(row.vendorId),
    materialId: String(row.materialId),
    unitPrice: row.unitPrice,
    currency: row.currency,
    taxRuleId: row.taxRuleId ? String(row.taxRuleId) : null,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
