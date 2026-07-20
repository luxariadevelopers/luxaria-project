import { DocumentStatus } from '@luxaria/shared-types';

export type CachedDownloadUrl = {
  /** Presigned GET URL — never store or display S3 keys. */
  url: string;
  fetchedAtMs: number;
  /** Seconds from Nest `download.expiresIn`. */
  expiresInSeconds: number;
};

/** Absolute expiry instant derived from Nest `expiresIn`. */
export function downloadUrlExpiresAtMs(cache: CachedDownloadUrl): number {
  return cache.fetchedAtMs + Math.max(0, cache.expiresInSeconds) * 1000;
}

/**
 * True when the private URL should be treated as expired.
 * Uses a small skew so clients refresh before the signature actually dies.
 */
export function isDownloadUrlExpired(
  cache: CachedDownloadUrl,
  nowMs = Date.now(),
  skewMs = 5_000,
): boolean {
  if (
    !Number.isFinite(cache.expiresInSeconds) ||
    cache.expiresInSeconds <= 0
  ) {
    return true;
  }
  return nowMs >= downloadUrlExpiresAtMs(cache) - skewMs;
}

/**
 * Nest `createPresignedDownload` allows active + replaced only.
 * Do not invent other downloadable statuses.
 */
export function canRequestDownloadForStatus(status: string): boolean {
  return (
    status === DocumentStatus.Active || status === DocumentStatus.Replaced
  );
}
