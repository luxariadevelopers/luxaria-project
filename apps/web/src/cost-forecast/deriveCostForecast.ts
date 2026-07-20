import type {
  CostSheetRow,
  ProjectDashboardCostSummary,
} from './types';

export type CostTrendPoint = {
  key: string;
  label: string;
  amount: number;
};

export type CategoryCostRow = {
  accountCategory: string;
  amount: number;
  rowCount: number;
  drillDown: CostSheetRow['drillDown'];
};

export type VarianceRow = {
  key: string;
  label: string;
  baselineAmount: number;
  compareAmount: number;
  varianceAmount: number;
  drillDown: CostSheetRow['drillDown'];
};

/**
 * Trend series from project dashboard tiles — amounts are API-authoritative.
 */
export function buildCostTrendPoints(
  summary: ProjectDashboardCostSummary,
): CostTrendPoint[] {
  return [
    {
      key: 'approvedBudget',
      label: 'Approved budget',
      amount: summary.approvedBudget.amount,
    },
    {
      key: 'revisedBudget',
      label: 'Revised budget',
      amount: summary.revisedBudget.amount,
    },
    {
      key: 'actualCost',
      label: 'Actual cost',
      amount: summary.actualCost.amount,
    },
    {
      key: 'committedCost',
      label: 'Committed',
      amount: summary.committedCost.amount,
    },
    {
      key: 'forecastCostToComplete',
      label: 'Forecast to complete',
      amount: summary.forecastCostToComplete.amount,
    },
    {
      key: 'projectedFinalCost',
      label: 'Projected final',
      amount: summary.projectedFinalCost.amount,
    },
  ];
}

/** Group cost-sheet rows by account category for the table (row amounts only). */
export function aggregateCostSheetByCategory(
  rows: readonly CostSheetRow[],
): CategoryCostRow[] {
  const map = new Map<string, CategoryCostRow>();
  for (const row of rows) {
    const key = row.accountCategory || 'Uncategorised';
    const existing = map.get(key);
    if (existing) {
      existing.amount += row.amount;
      existing.rowCount += 1;
      existing.drillDown = existing.drillDown.length
        ? existing.drillDown
        : row.drillDown;
    } else {
      map.set(key, {
        accountCategory: key,
        amount: row.amount,
        rowCount: 1,
        drillDown: row.drillDown,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.accountCategory.localeCompare(b.accountCategory),
  );
}

/** Variance rows for drill-down — uses dashboard API amounts, not recomputed totals. */
export function buildVarianceRows(
  summary: ProjectDashboardCostSummary,
): VarianceRow[] {
  return [
    {
      key: 'actual-vs-revised',
      label: 'Actual vs revised budget',
      baselineAmount: summary.revisedBudget.amount,
      compareAmount: summary.actualCost.amount,
      varianceAmount: summary.actualCost.amount - summary.revisedBudget.amount,
      drillDown: summary.actualCost.drillDown,
    },
    {
      key: 'projected-vs-revised',
      label: 'Projected final vs revised budget',
      baselineAmount: summary.revisedBudget.amount,
      compareAmount: summary.projectedFinalCost.amount,
      varianceAmount:
        summary.projectedFinalCost.amount - summary.revisedBudget.amount,
      drillDown: summary.projectedFinalCost.drillDown,
    },
    {
      key: 'forecast-to-complete',
      label: 'Forecast to complete',
      baselineAmount: summary.actualCost.amount,
      compareAmount: summary.forecastCostToComplete.amount,
      varianceAmount: summary.forecastCostToComplete.amount,
      drillDown: summary.forecastCostToComplete.drillDown,
    },
  ];
}

/** Pick the latest API calculation timestamp from loaded reports. */
export function latestGeneratedAt(
  timestamps: readonly (string | null | undefined)[],
): string | null {
  const valid = timestamps.filter(
    (t): t is string => typeof t === 'string' && t.length > 0,
  );
  if (valid.length === 0) {
    return null;
  }
  return valid.sort().at(-1) ?? null;
}
