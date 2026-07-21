import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  publishInvestorReport,
  recordInvestorProfitAllocation,
  updateInvestorDistributedProfit,
} from './api';
import { InvestorVisibleReportType } from './types';

vi.mock('@/api/client', () => ({
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}));

import { apiPatch, apiPost } from '@/api/client';

describe('investor portal manage api', () => {
  beforeEach(() => {
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
