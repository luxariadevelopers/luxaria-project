/**
 * Mirrors `apps/backend/src/modules/material-master` public shapes.
 * Nest permissions: `material.view` / `material.manage`
 * (prompt aliases `material.create` / `material.update` are not in the catalog).
 */

export const MaterialUnit = {
  Number: 'number',
  Bag: 'bag',
  Kilogram: 'kilogram',
  Ton: 'ton',
  Litre: 'litre',
  Metre: 'metre',
  SquareFoot: 'square_foot',
  CubicFoot: 'cubic_foot',
  Load: 'load',
  Box: 'box',
} as const;

export type MaterialUnit = (typeof MaterialUnit)[keyof typeof MaterialUnit];

export const MaterialStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type MaterialStatus = (typeof MaterialStatus)[keyof typeof MaterialStatus];

export type UnitConversionFactor = {
  unit: MaterialUnit;
  /** 1 × alternate unit = factorToBase × baseUnit */
  factorToBase: number;
};

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
  createdAt?: string;
  updatedAt?: string;
};

export type MaterialUnitOption = {
  code: MaterialUnit;
  label: string;
};

export type ListMaterialsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: MaterialStatus;
  category?: string;
  baseUnit?: MaterialUnit;
  brand?: string;
  ledgerAccountId?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedMaterials = {
  items: PublicMaterial[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type CreateMaterialInput = {
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
  ledgerAccountId: string;
  status?: MaterialStatus;
};

export type UpdateMaterialInput = Partial<CreateMaterialInput>;

/** Ledger categories accepted by Nest `MaterialsService.assertLedgerAccount`. */
export const MATERIAL_LEDGER_CATEGORIES = [
  'material_purchase',
  'work_in_progress',
  'direct_expense',
  'land_cost',
] as const;

export type MaterialLedgerOption = {
  id: string;
  accountCode: string;
  accountName: string;
  accountCategory: string;
};

// --- Phase 059 stock / usage types ---

export type PublicStockBalance = {
  id: string | null;
  materialId: string;
  projectId: string;
  location: string;
  quantityInBaseUnit: number;
  baseUnit: MaterialUnit;
  version: number;
  updatedAt?: string;
};

export const StockTransactionType = {
  OpeningStock: 'opening_stock',
  PurchaseReceipt: 'purchase_receipt',
  TransferIn: 'transfer_in',
  TransferOut: 'transfer_out',
  MaterialIssue: 'material_issue',
  ReturnFromWork: 'return_from_work',
  ReturnToVendor: 'return_to_vendor',
  Wastage: 'wastage',
  Damage: 'damage',
  TheftOrShortage: 'theft_or_shortage',
  Adjustment: 'adjustment',
  Reversal: 'reversal',
} as const;

export type StockTransactionType =
  (typeof StockTransactionType)[keyof typeof StockTransactionType];

export type PublicStockLedgerEntry = {
  id: string;
  transactionNumber: string;
  projectId: string;
  materialId: string;
  transactionType: StockTransactionType;
  quantityIn: number;
  quantityOut: number;
  unit: MaterialUnit;
  baseUnitQuantity: number;
  baseUnit: MaterialUnit;
  referenceType: string;
  referenceId: string | null;
  transactionDate: string;
  location: string | null;
  batch: string | null;
  createdBy: string;
  reversalOfId: string | null;
  reversedById: string | null;
  notes: string | null;
  createdAt?: string;
};

export type ListStockLedgerQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  materialId?: string;
  transactionType?: StockTransactionType;
  location?: string;
  search?: string;
};

export type PaginatedStockLedger = {
  items: PublicStockLedgerEntry[];
  meta: PaginatedMaterials['meta'];
};
