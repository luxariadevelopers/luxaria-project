import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRfq, fetchRfqs, issueRfq } from './api';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
}));

describe('rfq API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
  });

  it('lists RFQs with project filter', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'r1',
          companyId: 'c1',
          projectId: 'p1',
          siteId: null,
          purchaseRequestId: 'pr1',
          rfqNumber: 'RFQ-001',
          title: 'Cement',
          status: 'draft',
          vendorIds: ['v1'],
          closingDate: '2026-08-15',
          notes: null,
          issuedAt: null,
          issuedBy: null,
        },
      ],
      meta: { page: 1, limit: 20, total: 1 },
    });

    const result = await fetchRfqs({ projectId: 'p1', page: 1, limit: 20 });
    expect(apiGet).toHaveBeenCalledWith('/rfqs', {
      page: 1,
      limit: 20,
      projectId: 'p1',
      purchaseRequestId: undefined,
      status: undefined,
      search: undefined,
    });
    expect(result.items[0]?.rfqNumber).toBe('RFQ-001');
  });

  it('creates and issues an RFQ', async () => {
    apiPost
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: {
          id: 'r1',
          companyId: 'c1',
          projectId: 'p1',
          siteId: null,
          purchaseRequestId: 'pr1',
          rfqNumber: 'RFQ-001',
          title: 'Cement',
          status: 'draft',
          vendorIds: ['v1'],
          closingDate: '2026-08-15',
          notes: null,
          issuedAt: null,
          issuedBy: null,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: {
          id: 'r1',
          companyId: 'c1',
          projectId: 'p1',
          siteId: null,
          purchaseRequestId: 'pr1',
          rfqNumber: 'RFQ-001',
          title: 'Cement',
          status: 'issued',
          vendorIds: ['v1'],
          closingDate: '2026-08-15',
          notes: null,
          issuedAt: '2026-07-21T00:00:00.000Z',
          issuedBy: 'u1',
        },
      });

    const created = await createRfq({
      projectId: 'p1',
      purchaseRequestId: 'pr1',
      title: 'Cement',
      vendorIds: ['v1'],
      closingDate: '2026-08-15',
    });
    expect(created.status).toBe('draft');

    const issued = await issueRfq('r1');
    expect(apiPost).toHaveBeenLastCalledWith('/rfqs/r1/issue');
    expect(issued.status).toBe('issued');
  });
});
