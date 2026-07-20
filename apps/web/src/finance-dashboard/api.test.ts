import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFinanceDashboardSummary } from './api';

const apiGet = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
}));

describe('finance dashboard API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('propagates filters to GET /finance-dashboard/summary', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        filters: {
          date: '2026-07-20',
          projectId: 'p1',
          from: null,
          to: null,
          financialYearId: 'fy1',
          financialYearName: 'FY 2026-27',
          horizonDays: 30,
          accessibleProjectCount: 1,
        },
        companyBankBalances: { amount: 1_000_000, count: 2, drillDown: [] },
        cashBalances: { amount: 50_000, drillDown: [] },
        projectFundPosition: [],
        vendorAgeing: {
          current: 0,
          d0_30: 10,
          d31_60: 0,
          d61_90: 0,
          d90Plus: 0,
          total: 10,
          count: 1,
          drillDown: [],
        },
        contractorAgeing: {
          current: 0,
          d0_30: 0,
          d31_60: 0,
          d61_90: 0,
          d90Plus: 0,
          total: 0,
          count: 0,
          drillDown: [],
        },
        customerReceivables: { amount: 200_000, drillDown: [] },
        directorContributionPending: {
          participantType: 'director',
          committedAmount: 0,
          receivedAmount: 0,
          pendingAmount: 0,
          commitmentCount: 0,
          drillDown: [],
        },
        investorContributionPending: {
          participantType: 'outside_investor',
          committedAmount: 0,
          receivedAmount: 0,
          pendingAmount: 0,
          commitmentCount: 0,
          drillDown: [],
        },
        paymentApprovals: { amount: 0, count: 3, drillDown: [] },
        upcomingPayments: { amount: 100, count: 1, drillDown: [] },
        overduePayments: { amount: 50, count: 2, drillDown: [] },
        unsettledPettyCash: { amount: 0, drillDown: [] },
        journalErrors: { amount: 0, count: 1, drillDown: [] },
        bankReconciliationPending: {
          available: true,
          pendingCount: 0,
          amount: 0,
          message: 'No pending items',
          drillDown: [],
        },
        cashFlowForecast: {
          horizonDays: 30,
          totalInflows: 0,
          totalOutflows: 0,
          net: 0,
          series: [],
          drillDown: [],
        },
      },
    });

    const data = await fetchFinanceDashboardSummary({
      date: '2026-07-20',
      projectId: 'p1',
      financialYearId: 'fy1',
      horizonDays: 30,
    });

    expect(apiGet).toHaveBeenCalledWith('/finance-dashboard/summary', {
      date: '2026-07-20',
      projectId: 'p1',
      financialYearId: 'fy1',
      horizonDays: 30,
    });
    expect(data.companyBankBalances.amount).toBe(1_000_000);
    expect(data.paymentApprovals.count).toBe(3);
    expect(data.filters.financialYearName).toBe('FY 2026-27');
  });
});
