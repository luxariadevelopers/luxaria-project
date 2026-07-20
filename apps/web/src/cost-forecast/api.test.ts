import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProjectCostSheet, fetchProjectDashboardCosts } from './api';

const apiGet = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiClient: { get: vi.fn() },
}));

describe('cost forecast API clients', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('loads project cost sheet totals from API envelope', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        meta: {
          generatedAt: '2026-07-20T10:00:00.000Z',
          title: 'Project Cost Sheet',
          filters: { projectId: 'p1', from: null, to: null },
        },
        rows: [
          {
            accountId: 'a1',
            accountCode: '5001',
            accountName: 'Material',
            accountCategory: 'Direct Material',
            amount: 100,
            drillDown: [],
          },
        ],
        totals: { cost: 350 },
      },
    });

    const report = await fetchProjectCostSheet({ projectId: 'p1' });
    expect(apiGet).toHaveBeenCalledWith(
      '/accounting-reports/project-cost-sheet',
      { projectId: 'p1' },
    );
    expect(report.totals.cost).toBe(350);
    expect(report.meta.generatedAt).toBe('2026-07-20T10:00:00.000Z');
  });

  it('loads forecast tiles from project dashboard', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
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
        approvedBudget: { amount: 1, drillDown: [] },
        revisedBudget: { amount: 2, drillDown: [] },
        actualCost: { amount: 3, drillDown: [] },
        committedCost: { amount: 4, drillDown: [] },
        forecastCostToComplete: { amount: 5, drillDown: [] },
        projectedFinalCost: { amount: 8, drillDown: [] },
      },
    });

    const summary = await fetchProjectDashboardCosts({
      projectId: 'p1',
      date: '2026-07-20',
    });
    expect(apiGet).toHaveBeenCalledWith('/projects/p1/dashboard', {
      date: '2026-07-20',
    });
    expect(summary.forecastCostToComplete.amount).toBe(5);
    expect(summary.projectedFinalCost.amount).toBe(8);
  });
});
