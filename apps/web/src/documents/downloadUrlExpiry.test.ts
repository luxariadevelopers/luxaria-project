import { describe, expect, it } from 'vitest';
import { DocumentStatus } from '@luxaria/shared-types';
import {
  canRequestDownloadForStatus,
  downloadUrlExpiresAtMs,
  isDownloadUrlExpired,
} from './downloadUrlExpiry';

describe('downloadUrlExpiry', () => {
  it('computes expiry from Nest expiresIn seconds', () => {
    const cache = {
      url: 'https://example.invalid/presigned',
      fetchedAtMs: 1_000_000,
      expiresInSeconds: 900,
    };
    expect(downloadUrlExpiresAtMs(cache)).toBe(1_000_000 + 900_000);
  });

  it('treats private URL as expired after expiresIn (with skew)', () => {
    const cache = {
      url: 'https://example.invalid/presigned',
      fetchedAtMs: 1_000_000,
      expiresInSeconds: 60,
    };
    expect(isDownloadUrlExpired(cache, 1_000_000 + 10_000)).toBe(false);
    expect(isDownloadUrlExpired(cache, 1_000_000 + 60_000)).toBe(true);
    expect(isDownloadUrlExpired(cache, 1_000_000 + 56_000, 5_000)).toBe(true);
  });

  it('treats zero/invalid expiresIn as expired', () => {
    expect(
      isDownloadUrlExpired({
        url: 'https://example.invalid/x',
        fetchedAtMs: Date.now(),
        expiresInSeconds: 0,
      }),
    ).toBe(true);
  });

  it('only active and replaced statuses may request download URLs', () => {
    expect(canRequestDownloadForStatus(DocumentStatus.Active)).toBe(true);
    expect(canRequestDownloadForStatus(DocumentStatus.Replaced)).toBe(true);
    expect(canRequestDownloadForStatus(DocumentStatus.PendingUpload)).toBe(
      false,
    );
    expect(canRequestDownloadForStatus(DocumentStatus.Archived)).toBe(false);
  });
});
