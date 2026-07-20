import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchDirectorCommandCentreSummary,
  fetchDirectorFilterOptions,
  fetchFinancialYearFilterOptions,
} from './api';

const apiGet = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
}));

describe('director command centre API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('fetches summary with filter query params', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        filters: {
          date: '2026-07-20',
          projectId: 'p1',
          directorId: null,
          financialYearId: null,
          financialYearName: null,
          rangeFrom: null,
          rangeTo: null,
          accessibleProjectCount: 1,
        },
        totalCompanyBankBalance: { amount: 100, drillDown: [] },
        totalCashBalance: { amount: 10, drillDown: [] },
        projectWiseBankBalance: [],
        projectWisePettyCash: [],
        directorContributionSummary: {
          participantType: 'director',
          committedAmount: 0,
          receivedAmount: 0,
          pendingAmount: 0,
          participantCount: 0,
          commitmentCount: 0,
          drillDown: [],
        },
        investorContributionSummary: {
          participantType: 'outside_investor',
          committedAmount: 0,
          receivedAmount: 0,
          pendingAmount: 0,
          participantCount: 0,
          commitmentCount: 0,
          drillDown: [],
        },
        customerCollections: { amount: 0, drillDown: [] },
        vendorPayable: { amount: 0, drillDown: [] },
        contractorPayable: { amount: 0, drillDown: [] },
        paymentsDueToday: { amount: 0, drillDown: [] },
        overduePayments: { amount: 0, drillDown: [] },
        purchaseRequestsPending: { amount: 0, count: 2, drillDown: [] },
        costVersusBudget: [],
        physicalProgress: [],
        boqUtilisation: [],
        materialStockAlerts: { count: 0, items: [], drillDown: [] },
        labourShortfall: { count: 0, items: [], drillDown: [] },
        contractorPerformance: [],
        criticalExceptions: [],
      },
    });

    const data = await fetchDirectorCommandCentreSummary({
      date: '2026-07-20',
      projectId: 'p1',
    });

    expect(apiGet).toHaveBeenCalledWith('/director-command-centre/summary', {
      date: '2026-07-20',
      projectId: 'p1',
    });
    expect(data.purchaseRequestsPending.count).toBe(2);
    expect(data.filters.accessibleProjectCount).toBe(1);
  });

  it('loads director and financial-year filter lists', async () => {
    apiGet
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'd1',
            directorCode: 'DIR-1',
            fullName: 'Ada',
            status: 'active',
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'fy1',
            name: 'FY 2026-27',
            isCurrent: true,
            isLocked: false,
            status: 'open',
          },
        ],
      });

    await expect(fetchDirectorFilterOptions()).resolves.toEqual([
      {
        id: 'd1',
        directorCode: 'DIR-1',
        fullName: 'Ada',
        status: 'active',
      },
    ]);
    expect(apiGet).toHaveBeenCalledWith('/directors', {
      status: 'active',
      page: 1,
      limit: 100,
    });

    await expect(fetchFinancialYearFilterOptions()).resolves.toMatchObject([
      { id: 'fy1', name: 'FY 2026-27', isCurrent: true },
    ]);
    expect(apiGet).toHaveBeenCalledWith('/financial-years', {
      page: 1,
      limit: 50,
    });
  });
});
