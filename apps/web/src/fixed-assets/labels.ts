import {
  FixedAssetCategory,
  FixedAssetStatus,
  type FixedAssetCategory as Category,
  type FixedAssetStatus as Status,
} from './types';

export function fixedAssetCategoryLabel(category: Category): string {
  switch (category) {
    case FixedAssetCategory.PlantMachinery:
      return 'Plant & machinery';
    case FixedAssetCategory.Vehicle:
      return 'Vehicle';
    case FixedAssetCategory.Furniture:
      return 'Furniture';
    case FixedAssetCategory.Computer:
      return 'Computer';
    case FixedAssetCategory.Building:
      return 'Building';
    case FixedAssetCategory.Land:
      return 'Land';
    case FixedAssetCategory.Other:
      return 'Other';
    default:
      return category;
  }
}

export function fixedAssetStatusLabel(status: Status): string {
  switch (status) {
    case FixedAssetStatus.Draft:
      return 'Draft';
    case FixedAssetStatus.Active:
      return 'Active';
    case FixedAssetStatus.Disposed:
      return 'Disposed';
    case FixedAssetStatus.WrittenOff:
      return 'Written off';
    default:
      return status;
  }
}
