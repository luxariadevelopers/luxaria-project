import { describe, expect, it } from 'vitest';
import {
  countBoqItems,
  filterBoqHierarchy,
  findBoqItem,
  flattenBoqItems,
  summariseBoqHierarchy,
} from './hierarchy';
import {
  BoqHierarchyStatus,
  BoqItemStatus,
  BoqUnit,
  type BoqHierarchyBlock,
} from './types';

function sampleTree(): BoqHierarchyBlock[] {
  return [
    {
      id: 'b1',
      projectId: 'p1',
      blockCode: 'BLK-A',
      name: 'Block A',
      sortOrder: 1,
      status: BoqHierarchyStatus.Active,
      notes: null,
      floors: [
        {
          id: 'f1',
          projectId: 'p1',
          blockId: 'b1',
          floorCode: 'FL-GF',
          name: 'Ground',
          level: 0,
          sortOrder: 1,
          status: BoqHierarchyStatus.Active,
          notes: null,
          workCategories: [
            {
              id: 'c1',
              projectId: 'p1',
              blockId: 'b1',
              floorId: 'f1',
              categoryCode: 'WC-CIVIL',
              name: 'Civil',
              sortOrder: 1,
              status: BoqHierarchyStatus.Active,
              notes: null,
              items: [
                {
                  id: 'i1',
                  projectId: 'p1',
                  versionId: 'v1',
                  blockId: 'b1',
                  floorId: 'f1',
                  workCategoryId: 'c1',
                  boqCode: 'BOQ-001',
                  description: 'RCC columns',
                  unit: BoqUnit.CubicMetre,
                  plannedQuantity: 10,
                  materialCost: 100,
                  labourCost: 50,
                  subcontractCost: 20,
                  otherCost: 10,
                  plannedRate: 180,
                  plannedValue: 1800,
                  startDate: null,
                  endDate: null,
                  materialCoefficients: [],
                  status: BoqItemStatus.Active,
                  notes: null,
                },
                {
                  id: 'i2',
                  projectId: 'p1',
                  versionId: 'v1',
                  blockId: 'b1',
                  floorId: 'f1',
                  workCategoryId: 'c1',
                  boqCode: 'BOQ-002',
                  description: 'Brick work',
                  unit: BoqUnit.SquareMetre,
                  plannedQuantity: 5,
                  materialCost: 40,
                  labourCost: 30,
                  subcontractCost: 0,
                  otherCost: 0,
                  plannedRate: 70,
                  plannedValue: 350,
                  startDate: null,
                  endDate: null,
                  materialCoefficients: [],
                  status: BoqItemStatus.Draft,
                  notes: null,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'b2',
      projectId: 'p1',
      blockCode: 'BLK-B',
      name: 'Block B',
      sortOrder: 2,
      status: BoqHierarchyStatus.Active,
      notes: null,
      floors: [
        {
          id: 'f2',
          projectId: 'p1',
          blockId: 'b2',
          floorCode: 'FL-01',
          name: 'First',
          level: 1,
          sortOrder: 1,
          status: BoqHierarchyStatus.Active,
          notes: null,
          workCategories: [
            {
              id: 'c2',
              projectId: 'p1',
              blockId: 'b2',
              floorId: 'f2',
              categoryCode: 'WC-MEP',
              name: 'MEP',
              sortOrder: 1,
              status: BoqHierarchyStatus.Active,
              notes: null,
              items: [
                {
                  id: 'i3',
                  projectId: 'p1',
                  versionId: 'v1',
                  blockId: 'b2',
                  floorId: 'f2',
                  workCategoryId: 'c2',
                  boqCode: 'BOQ-003',
                  description: 'Electrical',
                  unit: BoqUnit.Job,
                  plannedQuantity: 1,
                  materialCost: 200,
                  labourCost: 100,
                  subcontractCost: 50,
                  otherCost: 0,
                  plannedRate: 350,
                  plannedValue: 350,
                  startDate: null,
                  endDate: null,
                  materialCoefficients: [],
                  status: BoqItemStatus.Active,
                  notes: null,
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

describe('BOQ hierarchy helpers', () => {
  it('flattens project → block → floor → category → item', () => {
    const flat = flattenBoqItems(sampleTree());
    expect(flat.map((i) => i.boqCode)).toEqual([
      'BOQ-001',
      'BOQ-002',
      'BOQ-003',
    ]);
    expect(flat[0]?.blockCode).toBe('BLK-A');
    expect(flat[0]?.categoryCode).toBe('WC-CIVIL');
    expect(countBoqItems(sampleTree())).toBe(3);
  });

  it('finds an item by id', () => {
    expect(findBoqItem(sampleTree(), 'i2')?.boqCode).toBe('BOQ-002');
    expect(findBoqItem(sampleTree(), 'missing')).toBeNull();
  });

  it('filters by block, status and search', () => {
    const byBlock = filterBoqHierarchy(sampleTree(), {
      search: '',
      blockId: 'b1',
      floorId: '',
      workCategoryId: '',
      status: '',
    });
    expect(flattenBoqItems(byBlock).map((i) => i.boqCode)).toEqual([
      'BOQ-001',
      'BOQ-002',
    ]);

    const byStatus = filterBoqHierarchy(sampleTree(), {
      search: '',
      blockId: '',
      floorId: '',
      workCategoryId: '',
      status: BoqItemStatus.Draft,
    });
    expect(flattenBoqItems(byStatus).map((i) => i.boqCode)).toEqual([
      'BOQ-002',
    ]);

    const bySearch = filterBoqHierarchy(sampleTree(), {
      search: 'electrical',
      blockId: '',
      floorId: '',
      workCategoryId: '',
      status: '',
    });
    expect(flattenBoqItems(bySearch).map((i) => i.boqCode)).toEqual([
      'BOQ-003',
    ]);
  });

  it('summarises hierarchy totals', () => {
    const totals = summariseBoqHierarchy(sampleTree());
    expect(totals.itemCount).toBe(3);
    expect(totals.plannedQuantity).toBe(16);
    expect(totals.plannedValue).toBe(2500);
    expect(totals.materialCost).toBe(340);
  });
});
