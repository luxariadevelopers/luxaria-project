import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProjectDashboard } from './projectDashboardApi';

const apiGet = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
}));

describe('fetchProjectDashboard', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('calls GET /projects/:projectId/dashboard with query', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        filters: {
          projectId: 'p1',
          date: '2026-07-20T00:00:00.000Z',
          from: null,
          to: null,
        },
        project: {
          id: 'p1',
          projectCode: 'PRJ-1',
          projectName: 'Tower',
          projectStage: 'construction',
          status: 'Active',
        },
        physicalCompletion: {
          percent: 40,
          numerator: 40,
          denominator: 100,
          drillDown: [],
        },
        financialCompletion: {
          percent: 30,
          numerator: 30,
          denominator: 100,
          drillDown: [],
        },
        capitalPlan: {
          approvedBudget: 100,
          totalInvested: 0,
          pendingToInvest: 100,
          equalDirectorInvestment: false,
          directorsEqual: false,
          directors: [],
          investors: [],
          drillDown: [],
        },
        approvedBudget: { amount: 100, drillDown: [] },
        revisedBudget: { amount: 0, drillDown: [] },
        actualCost: { amount: 30, drillDown: [] },
        committedCost: { amount: 0, drillDown: [] },
        forecastCostToComplete: { amount: 70, drillDown: [] },
        projectedFinalCost: { amount: 100, drillDown: [] },
        customerCollections: { amount: 0, drillDown: [] },
        investorFunding: {
          committedAmount: 0,
          receivedAmount: 0,
          pendingAmount: 0,
          commitmentCount: 0,
          drillDown: [],
        },
        bankBalance: { amount: 0, drillDown: [] },
        cashBalance: { amount: 0, drillDown: [] },
        materialStock: {
          materialCount: 0,
          totalQuantity: 0,
          locations: 0,
          drillDown: [],
        },
        labourAttendance: {
          asOfDate: '2026-07-20T00:00:00.000Z',
          sheetCount: 0,
          totalWorkers: 0,
          confirmedSheets: 0,
          submittedSheets: 0,
          drillDown: [],
        },
        contractorProgress: [],
        vendorDues: { amount: 0, drillDown: [] },
        purchaseOrders: {
          count: 0,
          issuedCount: 0,
          totalValue: 0,
          openBalance: 0,
          drillDown: [],
        },
        sitePhotos: { count: 0, recent: [], drillDown: [] },
        criticalAlerts: [],
        projectStage: {
          stage: 'construction',
          status: 'Active',
          drillDown: [],
        },
      },
    });

    const data = await fetchProjectDashboard('p1', {
      date: '2026-07-20',
    });

    expect(apiGet).toHaveBeenCalledWith('/projects/p1/dashboard', {
      date: '2026-07-20',
    });
    expect(data.project.projectCode).toBe('PRJ-1');
    expect(data.physicalCompletion.percent).toBe(40);
  });
});
