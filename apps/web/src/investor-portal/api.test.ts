import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODES } from '@luxaria/shared-types';
import {
  fetchInvestorDocuments,
  InvestorPortalAccessError,
} from './api';

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>();
  return {
    ...actual,
    apiGet: vi.fn(),
    isForbiddenError: actual.isForbiddenError,
  };
});

import { apiGet } from '@/api/client';

describe('fetchInvestorDocuments', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it('returns empty list when investor has no authorised projects', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({
      success: true,
      data: [],
      message: 'ok',
    });
    await expect(fetchInvestorDocuments()).resolves.toEqual([]);
    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it('surfaces 403 from project list as forbidden', async () => {
    const error = new axios.AxiosError('Forbidden');
    error.response = {
      status: 403,
      data: { errorCode: ERROR_CODES.FORBIDDEN, message: 'Forbidden' },
      statusText: 'Forbidden',
      headers: {},
      config: {} as never,
    };
    vi.mocked(apiGet).mockRejectedValueOnce(error);
    await expect(fetchInvestorDocuments()).rejects.toMatchObject({
      response: { status: 403 },
    });
  });

  it('throws InvestorPortalAccessError when a project detail is forbidden', async () => {
    vi.mocked(apiGet)
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            projectId: 'proj-1',
            projectCode: 'P-1',
            projectName: 'One',
            projectStage: 'construction',
            status: 'active',
            commitmentAmount: 1,
            amountContributed: 0,
            pendingContribution: 1,
            approvedProfitSharePercentage: 10,
            physicalProgressPercent: 0,
          },
        ],
        message: 'ok',
      })
      .mockRejectedValueOnce(
        Object.assign(new axios.AxiosError('Forbidden'), {
          response: {
            status: 403,
            data: { errorCode: ERROR_CODES.FORBIDDEN, message: 'Forbidden' },
            statusText: 'Forbidden',
            headers: {},
            config: {} as never,
          },
        }),
      );

    await expect(fetchInvestorDocuments()).rejects.toBeInstanceOf(
      InvestorPortalAccessError,
    );
  });
});
