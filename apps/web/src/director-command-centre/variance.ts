import type { ProjectDashboardSummary } from './projectDashboardTypes';

export type CostVariance = {
  /** actual − budget (positive = over budget). */
  amount: number;
  /** (actual − budget) / budget × 100; null when budget is 0. */
  percent: number | null;
  /** Budget used for the comparison (revised if &gt; 0, else approved). */
  budgetAmount: number;
};

export type ProgressGap = {
  /** physical% − financial% (positive = physical ahead of spend). */
  points: number;
};

/** Prefer revised budget when the API reports a positive revised amount. */
export function resolveBudgetAmount(
  summary: Pick<
    ProjectDashboardSummary,
    'approvedBudget' | 'revisedBudget'
  >,
): number {
  const revised = summary.revisedBudget.amount;
  if (revised > 0) {
    return revised;
  }
  return summary.approvedBudget.amount;
}

export function computeCostVariance(
  summary: Pick<
    ProjectDashboardSummary,
    'approvedBudget' | 'revisedBudget' | 'actualCost'
  >,
): CostVariance {
  const budgetAmount = resolveBudgetAmount(summary);
  const actual = summary.actualCost.amount;
  const amount = actual - budgetAmount;
  const percent =
    budgetAmount === 0 ? null : (amount / budgetAmount) * 100;
  return { amount, percent, budgetAmount };
}

export function computeProgressGap(
  summary: Pick<
    ProjectDashboardSummary,
    'physicalCompletion' | 'financialCompletion'
  >,
): ProgressGap {
  return {
    points:
      summary.physicalCompletion.percent -
      summary.financialCompletion.percent,
  };
}

export function criticalAlertTotals(
  alerts: ProjectDashboardSummary['criticalAlerts'],
): { critical: number; warning: number; total: number } {
  let critical = 0;
  let warning = 0;
  for (const alert of alerts) {
    if (alert.severity === 'critical') {
      critical += alert.count;
    } else {
      warning += alert.count;
    }
  }
  return { critical, warning, total: critical + warning };
}
