import type { Types } from 'mongoose';
import type {
  MaterialStatus,
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
    status: material.status,
    baseUnitLocked,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}
