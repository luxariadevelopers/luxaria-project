import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveFinancialYearUnlock,
  createFinancialYear,
  fetchCurrentFinancialYear,
  fetchFinancialYear,
  fetchFinancialYearCompany,
  fetchFinancialYears,
  fetchFinancialYearUnlockRequests,
  lockFinancialYear,
  rejectFinancialYearUnlock,
  requestFinancialYearUnlock,
  setCurrentFinancialYear,
  validateFinancialYearTransactionDate,
} from './api';
import {
  FinancialYearStatus,
  UnlockRequestStatus,
  type PublicFinancialYear,
  type PublicFinancialYearUnlockRequest,
} from './types';

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
}));

const financialYear: PublicFinancialYear = {
  id: '507f1f77bcf86cd799439011',
  companyId: '507f1f77bcf86cd799439012',
  name: 'FY 2026-27',
  startDate: '2026-04-01T00:00:00.000Z',
  endDate: '2027-03-31T23:59:59.999Z',
  status: FinancialYearStatus.Open,
  isCurrent: true,
  isLocked: false,
  lockedAt: null,
  lockedBy: null,
};

const unlockRequest: PublicFinancialYearUnlockRequest = {
  id: '507f1f77bcf86cd799439013',
  financialYearId: financialYear.id,
  reason: 'Correct a March journal entry',
  requestedBy: '507f1f77bcf86cd799439014',
  status: UnlockRequestStatus.Pending,
  approvedBy: null,
  approvedAt: null,
  approvalNote: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  createdAt: '2026-07-21T08:00:00.000Z',
};

describe('financial year API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
  });

  it('lists with only supported filters and reads response metadata', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [financialYear],
      meta: {
        page: 2,
        limit: 10,
        total: 15,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true,
      },
    });

    const result = await fetchFinancialYears({
      page: 2,
      limit: 10,
      companyId: financialYear.companyId!,
      status: FinancialYearStatus.Open,
      isCurrent: true,
      isLocked: false,
      sortOrder: 'asc',
    });

    expect(apiGet).toHaveBeenCalledWith('/financial-years', {
      page: 2,
      limit: 10,
      companyId: financialYear.companyId,
      status: FinancialYearStatus.Open,
      isCurrent: true,
      isLocked: false,
      sortOrder: 'asc',
    });
    expect(apiGet.mock.calls[0]?.[1]).not.toHaveProperty('search');
    expect(result.meta.total).toBe(15);
    expect(result.items[0]?.name).toBe('FY 2026-27');
  });

  it('uses create, current, set-current, and lock contracts exactly', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: financialYear,
    });
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: financialYear,
    });

    await fetchCurrentFinancialYear(financialYear.companyId);
    await createFinancialYear({
      name: ' FY 2026-27 ',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId: financialYear.companyId,
      setAsCurrent: true,
    });
    await setCurrentFinancialYear(financialYear.id);
    await lockFinancialYear(financialYear.id);

    expect(apiGet).toHaveBeenCalledWith('/financial-years/current', {
      companyId: financialYear.companyId,
    });
    expect(apiPost).toHaveBeenNthCalledWith(1, '/financial-years', {
      name: 'FY 2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId: financialYear.companyId,
      setAsCurrent: true,
    });
    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      `/financial-years/${financialYear.id}/set-current`,
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      3,
      `/financial-years/${financialYear.id}/lock`,
    );
  });

  it('loads detail and the authenticated company label read-only', async () => {
    apiGet
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: financialYear,
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: {
          id: financialYear.companyId,
          companyCode: 'LUX',
          legalName: 'Luxaria Developers Private Limited',
          tradeName: 'Luxaria',
          isPrimary: true,
        },
      });

    await fetchFinancialYear(financialYear.id);
    const company = await fetchFinancialYearCompany(
      financialYear.companyId,
    );

    expect(apiGet).toHaveBeenNthCalledWith(
      1,
      `/financial-years/${financialYear.id}`,
    );
    expect(apiGet).toHaveBeenNthCalledWith(
      2,
      `/companies/${financialYear.companyId}`,
    );
    expect(company.tradeName).toBe('Luxaria');
  });

  it('uses transaction validation and the two-step unlock endpoints', async () => {
    apiPost
      .mockResolvedValueOnce({
        success: true,
        message: 'valid',
        data: {
          valid: true,
          reason: null,
          financialYear,
          forPosting: true,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'requested',
        data: unlockRequest,
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'approved',
        data: {
          financialYear,
          unlockRequest: {
            ...unlockRequest,
            status: UnlockRequestStatus.Approved,
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        message: 'rejected',
        data: {
          ...unlockRequest,
          status: UnlockRequestStatus.Rejected,
        },
      });
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [unlockRequest],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    await validateFinancialYearTransactionDate({
      transactionDate: '2026-07-21',
      forPosting: true,
      companyId: financialYear.companyId,
    });
    await requestFinancialYearUnlock(financialYear.id, {
      reason: ' Correct a March journal entry ',
    });
    await fetchFinancialYearUnlockRequests(financialYear.id, {
      page: 1,
      limit: 20,
      status: UnlockRequestStatus.Pending,
    });
    await approveFinancialYearUnlock(
      financialYear.id,
      unlockRequest.id,
      { approvalNote: ' Approved correction ' },
    );
    await rejectFinancialYearUnlock(
      financialYear.id,
      unlockRequest.id,
      { rejectionReason: ' Use an adjustment instead ' },
    );

    expect(apiPost).toHaveBeenNthCalledWith(
      1,
      '/financial-years/validate-date',
      {
        transactionDate: '2026-07-21',
        forPosting: true,
        companyId: financialYear.companyId,
      },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      `/financial-years/${financialYear.id}/unlock-requests`,
      { reason: 'Correct a March journal entry' },
    );
    expect(apiGet).toHaveBeenCalledWith(
      `/financial-years/${financialYear.id}/unlock-requests`,
      {
        page: 1,
        limit: 20,
        status: UnlockRequestStatus.Pending,
      },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      3,
      `/financial-years/${financialYear.id}/unlock-requests/${unlockRequest.id}/approve`,
      { approvalNote: 'Approved correction' },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      4,
      `/financial-years/${financialYear.id}/unlock-requests/${unlockRequest.id}/reject`,
      { rejectionReason: 'Use an adjustment instead' },
    );
  });
});
