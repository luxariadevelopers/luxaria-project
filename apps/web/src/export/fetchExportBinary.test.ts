import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchExportBinary } from './fetchExportBinary';

const getMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

describe('fetchExportBinary', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('downloads binary with sanitized filename and MIME', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    getMock.mockResolvedValueOnce({
      data: new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      headers: {
        'content-disposition':
          'attachment; filename="../../trial-balance.xlsx"',
        'content-type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    const result = await fetchExportBinary({
      url: '/accounting-reports/trial-balance/export',
      params: { format: 'xlsx' },
      format: 'xlsx',
      fallbackFilename: 'trial-balance.xlsx',
    });

    expect(result.filename).toBe('trial-balance.xlsx');
    expect(result.contentType).toContain('spreadsheetml');
    expect(result.blob.size).toBe(3);
  });

  it('maps JSON error blob responses to ApiError', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 403,
        data: new Blob(
          [
            JSON.stringify({
              success: false,
              message: 'Forbidden',
            }),
          ],
          { type: 'application/json' },
        ),
      },
    };
    getMock.mockRejectedValueOnce(axiosError);

    // axios.isAxiosError needs the real check — stub via Object.assign shape
    // used by our catch path when data is Blob.
    await expect(
      fetchExportBinary({
        url: '/finance-dashboard/export',
        format: 'csv',
        fallbackFilename: 'finance.csv',
      }),
    ).rejects.toMatchObject({
      success: false,
      message: 'Forbidden',
    });
  });
});
