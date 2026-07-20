import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentStatus } from '@luxaria/shared-types';
import { usePresignedDownload } from './usePresignedDownload';

const getDocumentDownloadUrl = vi.fn();

vi.mock('@/api/documents', () => ({
  getDocumentDownloadUrl: (...args: unknown[]) =>
    getDocumentDownloadUrl(...args),
}));

describe('usePresignedDownload', () => {
  beforeEach(() => {
    getDocumentDownloadUrl.mockReset();
  });

  it('refuses download without document.download permission', async () => {
    const { result } = renderHook(() =>
      usePresignedDownload({
        documentId: 'd1',
        status: DocumentStatus.Active,
        canDownload: false,
      }),
    );

    await act(async () => {
      await result.current.ensureUrl();
    });

    expect(getDocumentDownloadUrl).not.toHaveBeenCalled();
    expect(result.current.denied).toBe(true);
    expect(result.current.error).toMatch(/document\.download/);
  });

  it('reuses URL until Nest expiresIn elapses, then refreshes', async () => {
    getDocumentDownloadUrl
      .mockResolvedValueOnce({
        document: { id: 'd1' },
        download: {
          url: 'https://example.invalid/a',
          method: 'GET',
          expiresIn: 60,
        },
        security: { bucketPrivate: true, publicAccess: false },
      })
      .mockResolvedValueOnce({
        document: { id: 'd1' },
        download: {
          url: 'https://example.invalid/b',
          method: 'GET',
          expiresIn: 60,
        },
        security: { bucketPrivate: true, publicAccess: false },
      });

    const { result } = renderHook(() =>
      usePresignedDownload({
        documentId: 'd1',
        status: DocumentStatus.Active,
        canDownload: true,
      }),
    );

    await act(async () => {
      await result.current.ensureUrl();
    });
    expect(result.current.url).toBe('https://example.invalid/a');
    expect(getDocumentDownloadUrl).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.ensureUrl();
    });
    expect(getDocumentDownloadUrl).toHaveBeenCalledTimes(1);

    const cache = result.current.getCache();
    expect(cache).toBeTruthy();
    // Force expiry
    if (cache) {
      cache.fetchedAtMs = Date.now() - 120_000;
    }

    await act(async () => {
      await result.current.ensureUrl();
    });

    await waitFor(() => {
      expect(result.current.url).toBe('https://example.invalid/b');
    });
    expect(getDocumentDownloadUrl).toHaveBeenCalledTimes(2);
  });

  it('maps 403 download as permission denial', async () => {
    getDocumentDownloadUrl.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          success: false,
          errorCode: 'FORBIDDEN',
          message: 'Forbidden',
          details: [],
          requestId: 'r1',
          timestamp: new Date().toISOString(),
        },
      },
    });

    const { result } = renderHook(() =>
      usePresignedDownload({
        documentId: 'd1',
        status: DocumentStatus.Active,
        canDownload: true,
      }),
    );

    await act(async () => {
      await result.current.ensureUrl();
    });

    expect(result.current.denied).toBe(true);
    expect(result.current.url).toBeNull();
  });
});
