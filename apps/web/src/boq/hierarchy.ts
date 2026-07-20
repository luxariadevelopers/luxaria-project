import type {
  BoqFilterState,
  BoqHierarchyBlock,
  BoqHierarchyCategory,
  BoqHierarchyFloor,
  PublicBoqItem,
} from './types';

export type BoqFlatItem = PublicBoqItem & {
  blockCode: string;
  blockName: string;
  floorCode: string;
  floorName: string;
  categoryCode: string;
  categoryName: string;
};

/** Flatten hierarchy to items (project → block → floor → category → item). */
export function flattenBoqItems(
  blocks: readonly BoqHierarchyBlock[],
): BoqFlatItem[] {
  const out: BoqFlatItem[] = [];
  for (const block of blocks) {
    for (const floor of block.floors) {
      for (const category of floor.workCategories) {
        for (const item of category.items) {
          out.push({
            ...item,
            blockCode: block.blockCode,
            blockName: block.name,
            floorCode: floor.floorCode,
            floorName: floor.name,
            categoryCode: category.categoryCode,
            categoryName: category.name,
          });
        }
      }
    }
  }
  return out;
}

function itemMatchesSearch(item: BoqFlatItem, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    item.boqCode.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.blockCode.toLowerCase().includes(q) ||
    item.blockName.toLowerCase().includes(q) ||
    item.floorCode.toLowerCase().includes(q) ||
    item.floorName.toLowerCase().includes(q) ||
    item.categoryCode.toLowerCase().includes(q) ||
    item.categoryName.toLowerCase().includes(q)
  );
}

export function filterBoqHierarchy(
  blocks: readonly BoqHierarchyBlock[],
  filters: BoqFilterState,
): BoqHierarchyBlock[] {
  const result: BoqHierarchyBlock[] = [];

  for (const block of blocks) {
    if (filters.blockId && block.id !== filters.blockId) continue;

    const floors: BoqHierarchyFloor[] = [];
    for (const floor of block.floors) {
      if (filters.floorId && floor.id !== filters.floorId) continue;

      const workCategories: BoqHierarchyCategory[] = [];
      for (const category of floor.workCategories) {
        if (
          filters.workCategoryId &&
          category.id !== filters.workCategoryId
        ) {
          continue;
        }

        const items = category.items.filter((item) => {
          if (filters.status && item.status !== filters.status) return false;
          const flat: BoqFlatItem = {
            ...item,
            blockCode: block.blockCode,
            blockName: block.name,
            floorCode: floor.floorCode,
            floorName: floor.name,
            categoryCode: category.categoryCode,
            categoryName: category.name,
          };
          return itemMatchesSearch(flat, filters.search);
        });

        if (items.length > 0 || (!filters.search && !filters.status)) {
          if (filters.search || filters.status) {
            if (items.length === 0) continue;
          }
          workCategories.push({ ...category, items });
        }
      }

      if (workCategories.length > 0) {
        floors.push({ ...floor, workCategories });
      }
    }

    if (floors.length > 0) {
      result.push({ ...block, floors });
    }
  }

  return result;
}

export function findBoqItem(
  blocks: readonly BoqHierarchyBlock[],
  itemId: string,
): PublicBoqItem | null {
  for (const block of blocks) {
    for (const floor of block.floors) {
      for (const category of floor.workCategories) {
        const found = category.items.find((i) => i.id === itemId);
        if (found) return found;
      }
    }
  }
  return null;
}

export function countBoqItems(blocks: readonly BoqHierarchyBlock[]): number {
  return flattenBoqItems(blocks).length;
}

/** Client-side summary from hierarchy items (mirrors Nest validate-totals sums). */
export function summariseBoqHierarchy(blocks: readonly BoqHierarchyBlock[]): {
  itemCount: number;
  plannedQuantity: number;
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
  plannedValue: number;
} {
  const items = flattenBoqItems(blocks);
  return {
    itemCount: items.length,
    plannedQuantity: items.reduce((s, i) => s + i.plannedQuantity, 0),
    materialCost: items.reduce((s, i) => s + i.materialCost, 0),
    labourCost: items.reduce((s, i) => s + i.labourCost, 0),
    subcontractCost: items.reduce((s, i) => s + i.subcontractCost, 0),
    otherCost: items.reduce((s, i) => s + i.otherCost, 0),
    plannedValue: items.reduce((s, i) => s + i.plannedValue, 0),
  };
}

export function emptyBoqFilters(): BoqFilterState {
  return {
    search: '',
    blockId: '',
    floorId: '',
    workCategoryId: '',
    status: '',
  };
}
