import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMaster, fetchMasterList, seedProcurementMasterDefaults } from './api';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
}));

describe('procurement masters API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
  });

  it('lists payment terms from /procurement-masters/payment-terms', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: '1',
          companyId: 'c1',
          code: 'NET30',
          name: 'Net 30',
          days: 30,
          status: 'active',
        },
      ],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });

    const result = await fetchMasterList('payment-terms', { page: 1, limit: 50 });
    expect(apiGet).toHaveBeenCalledWith('/procurement-masters/payment-terms', {
      page: 1,
      limit: 50,
      search: undefined,
      status: undefined,
    });
    expect(result.items[0]?.code).toBe('NET30');
    expect(result.meta?.total).toBe(1);
  });

  it('creates a catalog item', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: '2',
        companyId: 'c1',
        code: 'CAT1',
        name: 'Category 1',
        status: 'active',
      },
    });

    const created = await createMaster('purchase-categories', {
      code: 'CAT1',
      name: 'Category 1',
    });
    expect(apiPost).toHaveBeenCalledWith(
      '/procurement-masters/purchase-categories',
      { code: 'CAT1', name: 'Category 1' },
    );
    expect(created.id).toBe('2');
  });

  it('seeds defaults', async () => {
    apiPost.mockResolvedValue({ success: true, message: 'ok', data: null });
    await seedProcurementMasterDefaults();
    expect(apiPost).toHaveBeenCalledWith(
      '/procurement-masters/seed-defaults',
      {},
    );
  });
});
