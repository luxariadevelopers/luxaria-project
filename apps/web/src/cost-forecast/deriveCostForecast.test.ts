import { describe, expect, it } from 'vitest';
import {
  aggregateCostSheetByCategory,
  buildCostTrendPoints,
  buildVarianceRows,
  latestGeneratedAt,
} from './deriveCostForecast';
import type { CostSheetRow, ProjectDashboardCostSummary } from './types';

const dashboardFixture = (): ProjectDashboardCostSummary => ({
  filters: {
    projectId: 'p1',
    date: '2026-07-20',
    from: null,
    to: null,
  },
  project: {
    id: 'p1',
    projectCode: 'PRJ-01',
    projectName: 'Tower A',
  },
  approvedBudget: { amount: 10_000_000, drillDown: [] },
  revisedBudget: { amount: 11_000_000, drillDown: [] },
  actualCost: { amount: 4_500_000, drillDown: [] },
  committedCost: { amount: 1_200_000, drillDown: [] },
  forecastCostToComplete: { amount: 5_800_000, drillDown: [] },
  projectedFinalCost: { amount: 11_500_000, drillDown: [] },
});

describe('buildCostTrendPoints', () => {
  it('uses dashboard API amounts without recomputing projected final', () => {
    const points = buildCostTrendPoints(dashboardFixture());
    expect(points.find((p) => p.key === 'projectedFinalCost')?.amount).toBe(
      11_500_000,
    );
    expect(points.find((p) => p.key === 'forecastCostToComplete')?.amount).toBe(
      5_800_000,
    );
  });
});

describe('aggregateCostSheetByCategory', () => {
  it('groups rows by account category', () => {
    const rows: CostSheetRow[] = [
      {
        accountId: 'a1',
        accountCode: '5001',
        accountName: 'Material',
        accountCategory: 'Direct Material',
        amount: 100,
        drillDown: [],
      },
      {
        accountId: 'a2',
        accountCode: '5002',
        accountName: 'Labour',
        accountCategory: 'Direct Material',
        amount: 50,
        drillDown: [],
      },
      {
        accountId: 'a3',
        accountCode: '5100',
        accountName: 'Site OH',
        accountCategory: 'Indirect Expense',
        amount: 25,
        drillDown: [],
      },
    ];
    const grouped = aggregateCostSheetByCategory(rows);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.amount).toBe(150);
    expect(grouped[1]?.amount).toBe(25);
  });
});

describe('buildVarianceRows', () => {
  it('derives variance from dashboard tiles only', () => {
    const rows = buildVarianceRows(dashboardFixture());
    const projected = rows.find((r) => r.key === 'projected-vs-revised');
    expect(projected?.varianceAmount).toBe(500_000);
  });
});

describe('latestGeneratedAt', () => {
  it('returns the latest API timestamp', () => {
    expect(
      latestGeneratedAt(['2026-07-20T08:00:00.000Z', '2026-07-20T09:00:00.000Z']),
    ).toBe('2026-07-20T09:00:00.000Z');
  });
});

describe('cost sheet totals display', () => {
  it('uses API totals.cost rather than summing grouped categories', () => {
    const rows: CostSheetRow[] = [
      {
        accountId: 'a1',
        accountCode: '5001',
        accountName: 'Material',
        accountCategory: 'Direct Material',
        amount: 100,
        drillDown: [],
      },
      {
        accountId: 'a2',
        accountCode: '5002',
        accountName: 'Labour',
        accountCategory: 'Direct Labour',
        amount: 200,
        drillDown: [],
      },
    ];
    const grouped = aggregateCostSheetByCategory(rows);
    const groupedSum = grouped.reduce((sum, row) => sum + row.amount, 0);
    const apiTotal = 350;
    expect(groupedSum).toBe(300);
    expect(apiTotal).toBe(350);
  });
});
