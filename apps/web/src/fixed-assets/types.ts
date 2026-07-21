/** Mirrors Nest `apps/backend/src/modules/fixed-assets`. */

export const FixedAssetStatus = {
  Draft: 'draft',
  Active: 'active',
  Disposed: 'disposed',
  WrittenOff: 'written_off',
} as const;

export type FixedAssetStatus =
  (typeof FixedAssetStatus)[keyof typeof FixedAssetStatus];

export const FixedAssetCategory = {
  PlantMachinery: 'plant_machinery',
  Vehicle: 'vehicle',
  Furniture: 'furniture',
  Computer: 'computer',
  Building: 'building',
  Land: 'land',
  Other: 'other',
} as const;

export type FixedAssetCategory =
  (typeof FixedAssetCategory)[keyof typeof FixedAssetCategory];

export type PublicFixedAsset = {
  id: string;
  assetNumber: string;
  companyId: string;
  projectId: string | null;
  name: string;
  category: FixedAssetCategory;
  capitalizationDate: string;
  grossBlock: number;
  accumulatedDepreciation: number;
  netBlock: number;
  status: FixedAssetStatus;
  createdAt?: string;
};

export type FixedAssetListRow = Pick<
  PublicFixedAsset,
  | 'id'
  | 'assetNumber'
  | 'name'
  | 'category'
  | 'capitalizationDate'
  | 'grossBlock'
  | 'netBlock'
  | 'status'
  | 'projectId'
>;

export type ListFixedAssetsQuery = {
  page?: number;
  limit?: number;
  companyId?: string;
  projectId?: string;
  status?: FixedAssetStatus;
  category?: FixedAssetCategory;
};

export type PaginatedFixedAssets = {
  items: FixedAssetListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
