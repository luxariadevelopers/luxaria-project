import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchProfitAllocations,
  publishInvestorReport,
  recordInvestorProfitAllocation,
  updateInvestorDistributedProfit,
} from './api';
import { InvestorVisibleReportType } from './types';

vi.mock('@/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}));

import { apiGet, apiPatch, apiPost } from '@/api/client';

describe('investor portal manage api', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
    vi.mocked(apiPost).mockReset();
    vi.mocked(apiPatch).mockReset();
  });

  it('posts publish report payload', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      success: true,
      message: 'ok',
      data: { id: 'r1', projectId: 'p1', title: 'Q1', status: 'published', publishedAt: null },
    });

    await publishInvestorReport({
      projectId: '507f1f77bcf86cd799439011',
      title: 'Q1 update',
      reportType: InvestorVisibleReportType.Progress,
      summary: 'On track',
    });

    expect(apiPost).toHaveBeenCalledWith('/investor-portal/reports', {
      projectId: '507f1f77bcf86cd799439011',
      title: 'Q1 update',
      reportType: InvestorVisibleReportType.Progress,
      summary: 'On track',
    });
  });

  it('gets profit allocations for a project', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'a1',
          projectId: '507f1f77bcf86cd799439011',
          participantId: '507f1f77bcf86cd799439012',
          investorId: 'inv1',
          periodLabel: 'FY 2025',
          allocatedAmount: 1000,
          distributedAmount: 250,
          undistributedAmount: 750,
          status: 'approved',
          approvedAt: '2026-07-01T00:00:00.000Z',
          createdAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    });

    const rows = await fetchProfitAllocations({
      projectId: '507f1f77bcf86cd799439011',
    });

    expect(apiGet).toHaveBeenCalledWith('/investor-portal/profit-allocations', {
      projectId: '507f1f77bcf86cd799439011',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.undistributedAmount).toBe(750);
  });

  it('posts profit allocation payload', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'a1',
        projectId: 'p1',
        participantId: 'part1',
        investorId: 'inv1',
        allocatedAmount: 1000,
        distributedAmount: 0,
        undistributedAmount: 1000,
      },
    });

    await recordInvestorProfitAllocation({
      projectId: '507f1f77bcf86cd799439011',
      participantId: '507f1f77bcf86cd799439012',
      allocatedAmount: 1000,
    });

    expect(apiPost).toHaveBeenCalledWith('/investor-portal/profit-allocations', {
      projectId: '507f1f77bcf86cd799439011',
      participantId: '507f1f77bcf86cd799439012',
      allocatedAmount: 1000,
    });
  });

  it('patches distributed profit', async () => {
    vi.mocked(apiPatch).mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'a1',
        allocatedAmount: 1000,
        distributedAmount: 500,
        undistributedAmount: 500,
      },
    });

    await updateInvestorDistributedProfit('507f1f77bcf86cd799439013', {
      distributedAmount: 500,
    });

    expect(apiPatch).toHaveBeenCalledWith(
      '/investor-portal/profit-allocations/507f1f77bcf86cd799439013/distributed',
      { distributedAmount: 500 },
    );
  });
});
