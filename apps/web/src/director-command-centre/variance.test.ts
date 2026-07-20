import { describe, expect, it } from 'vitest';
import {
  computeCostVariance,
  computeProgressGap,
  criticalAlertTotals,
  resolveBudgetAmount,
} from './variance';
import type { ProjectDashboardSummary } from './projectDashboardTypes';

function money(amount: number) {
  return { amount, drillDown: [] };
}

function percent(value: number) {
  return {
    percent: value,
    numerator: value,
    denominator: 100,
    drillDown: [],
  };
}

describe('resolveBudgetAmount / cost variance', () => {
  it('prefers revised budget when positive', () => {
    expect(
      resolveBudgetAmount({
        approvedBudget: money(1_000_000),
        revisedBudget: money(1_200_000),
      }),
    ).toBe(1_200_000);
  });

  it('computes over-budget variance', () => {
    const v = computeCostVariance({
      approvedBudget: money(100),
      revisedBudget: money(0),
      actualCost: money(120),
    });
    expect(v.amount).toBe(20);
    expect(v.percent).toBeCloseTo(20);
  });
});

describe('computeProgressGap', () => {
  it('returns physical minus financial points', () => {
    expect(
      computeProgressGap({
        physicalCompletion: percent(40),
        financialCompletion: percent(25),
      }).points,
    ).toBe(15);
  });
});

describe('criticalAlertTotals', () => {
  it('sums critical and warning counts', () => {
    const totals = criticalAlertTotals([
      {
        code: 'A',
        severity: 'critical',
        message: 'x',
        count: 2,
        drillDown: [],
      },
      {
        code: 'B',
        severity: 'warning',
        message: 'y',
        count: 3,
        drillDown: [],
      },
    ] as ProjectDashboardSummary['criticalAlerts']);
    expect(totals).toEqual({ critical: 2, warning: 3, total: 5 });
  });
});
