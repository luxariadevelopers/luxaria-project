import type { Types } from 'mongoose';
import type {
  AbcClassification,
  MaterialStatus,
  MaterialType,
  MaterialUnit,
  UnitConversionFactor,
} from './schemas/material.schema';

export type PublicMaterial = {
  id: string;
  materialCode: string;
  name: string;
  category: string;
  specification: string | null;
  brand: string | null;
  baseUnit: MaterialUnit;
  alternateUnits: MaterialUnit[];
  conversionFactors: UnitConversionFactor[];
  standardRate: number;
  minimumStock: number;
  reorderLevel: number;
  maximumStock: number;
  standardWastagePercentage: number;
  ledgerAccountId: string;
  materialCategoryId: string | null;
  materialGroup: string | null;
  hsnCode: string | null;
  gstRate: number | null;
  preferredVendorIds: string[];
  shelfLifeDays: number | null;
  batchControlled: boolean;
  serialControlled: boolean;
  materialType: MaterialType;
  abcClassification: AbcClassification | null;
  barcode: string | null;
  status: MaterialStatus;
  baseUnitLocked: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type MaterialLike = {
  _id: Types.ObjectId | string;
  materialCode: string;
  name: string;
  category: string;
  specification?: string | null;
  brand?: string | null;
  baseUnit: MaterialUnit;
  alternateUnits?: MaterialUnit[];
  conversionFactors?: UnitConversionFactor[];
  standardRate?: number;
  minimumStock?: number;
  reorderLevel?: number;
  maximumStock?: number;
  standardWastagePercentage?: number;
  ledgerAccountId: Types.ObjectId | string;
  materialCategoryId?: Types.ObjectId | string | null;
  materialGroup?: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;
  preferredVendorIds?: Array<Types.ObjectId | string>;
  shelfLifeDays?: number | null;
  batchControlled?: boolean;
  serialControlled?: boolean;
  materialType?: MaterialType;
  abcClassification?: AbcClassification | null;
  barcode?: string | null;
  status: MaterialStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicMaterial(
  material: MaterialLike,
  baseUnitLocked = false,
): PublicMaterial {
  return {
    id: String(material._id),
    materialCode: material.materialCode,
    name: material.name,
    category: material.category,
    specification: material.specification ?? null,
    brand: material.brand ?? null,
    baseUnit: material.baseUnit,
    alternateUnits: material.alternateUnits ?? [],
    conversionFactors: (material.conversionFactors ?? []).map((f) => ({
      unit: f.unit,
      factorToBase: f.factorToBase,
    })),
    standardRate: material.standardRate ?? 0,
    minimumStock: material.minimumStock ?? 0,
    reorderLevel: material.reorderLevel ?? 0,
    maximumStock: material.maximumStock ?? 0,
    standardWastagePercentage: material.standardWastagePercentage ?? 0,
    ledgerAccountId: String(material.ledgerAccountId),
    materialCategoryId: material.materialCategoryId
      ? String(material.materialCategoryId)
      : null,
    materialGroup: material.materialGroup ?? null,
    hsnCode: material.hsnCode ?? null,
    gstRate: material.gstRate ?? null,
    preferredVendorIds: (material.preferredVendorIds ?? []).map(String),
    shelfLifeDays: material.shelfLifeDays ?? null,
    batchControlled: material.batchControlled ?? false,
    serialControlled: material.serialControlled ?? false,
    materialType: material.materialType ?? ('consumable' as MaterialType),
    abcClassification: material.abcClassification ?? null,
    barcode: material.barcode ?? null,
    status: material.status,
    baseUnitLocked,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}
