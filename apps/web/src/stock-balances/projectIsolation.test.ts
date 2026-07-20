import { describe, expect, it } from 'vitest';
import {
  applyStockBalanceClientFilters,
  isolateStockRowsToProject,
} from './applyClientFilters';
import { stockBalancesKeys } from './queryKeys';
import { StockReorderAlertType, type StockBalanceRow } from './types';

const PROJECT_A = '507f1f77bcf86cd799439011';
const PROJECT_B = '507f1f77bcf86cd799439022';

function row(
  overrides: Partial<StockBalanceRow> &
    Pick<StockBalanceRow, 'projectId' | 'materialId'>,
): StockBalanceRow {
  return {
    materialCode: 'MAT-1',
    materialName: 'Cement',
    quantityInBaseUnit: 10,
    baseUnit: 'bag',
    location: '',
    reorderLevel: 5,
    minimumStock: 2,
    maximumStock: 100,
    pendingPoQuantity: 0,
    alerts: [],
    ...overrides,
  };
}

describe('project isolation', () => {
  it('drops rows from other projects', () => {
    const mixed = [
      row({ projectId: PROJECT_A, materialId: 'm1' }),
      row({ projectId: PROJECT_B, materialId: 'm2', materialCode: 'MAT-2' }),
    ];
    const isolated = isolateStockRowsToProject(mixed, PROJECT_A);
    expect(isolated).toHaveLength(1);
    expect(isolated[0]?.projectId).toBe(PROJECT_A);
    expect(isolated.every((r) => r.projectId === PROJECT_A)).toBe(true);
  });

  it('returns empty when project id is blank', () => {
    expect(
      isolateStockRowsToProject(
        [row({ projectId: PROJECT_A, materialId: 'm1' })],
        '',
      ),
    ).toEqual([]);
  });

  it('embeds projectId in every query key', () => {
    const forecastKey = stockBalancesKeys.forecast(PROJECT_A, {});
    const locationKey = stockBalancesKeys.locationBalances(
      PROJECT_A,
      'Main Store',
    );
    const balanceKey = stockBalancesKeys.balance(
      PROJECT_A,
      'm1',
      'Main Store',
    );

    expect(forecastKey).toContain(PROJECT_A);
    expect(locationKey).toContain(PROJECT_A);
    expect(balanceKey).toContain(PROJECT_A);

    expect(forecastKey).not.toContain(PROJECT_B);
    expect(locationKey).not.toContain(PROJECT_B);
  });

  it('client filters never reintroduce foreign project rows', () => {
    const isolated = isolateStockRowsToProject(
      [
        row({ projectId: PROJECT_A, materialId: 'm1' }),
        row({
          projectId: PROJECT_B,
          materialId: 'm2',
          materialCode: 'CEMENT-B',
          alerts: [StockReorderAlertType.BelowReorderLevel],
          quantityInBaseUnit: 1,
        }),
      ],
      PROJECT_A,
    );
    const filtered = applyStockBalanceClientFilters(isolated, {
      search: 'cement',
      lowStockOnly: false,
    });
    expect(filtered.every((r) => r.projectId === PROJECT_A)).toBe(true);
    expect(filtered).toHaveLength(1);
  });
});
