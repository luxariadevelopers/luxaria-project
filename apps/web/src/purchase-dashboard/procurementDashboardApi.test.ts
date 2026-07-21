import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildOpsPipelineCards,
  fetchProcurementDashboard,
} from './procurementDashboardApi';

const apiGet = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
}));

describe('procurement dashboard API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('calls GET /procurement/dashboard with projectId', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        pendingPr: 2,
        pendingRfq: 1,
        pendingQuotations: 3,
        pendingApprovals: 1,
        openPo: 4,
        delayedPo: 1,
        grnDraft: 0,
        budgetUtilization: null,
      },
    });

    const counts = await fetchProcurementDashboard('p1');
    expect(apiGet).toHaveBeenCalledWith('/procurement/dashboard', {
      projectId: 'p1',
    });
    expect(counts.pendingRfq).toBe(1);
    expect(buildOpsPipelineCards(counts)).toHaveLength(7);
  });
});
