import { ERROR_CODES, type ApiError } from '@luxaria/shared-types';
import { EXPORT_MIME } from './constants';

const FILENAME_SAFE = /^[\w.\- ()[\]]+$/;

function fallbackApiError(message: string): ApiError {
  return {
    success: false,
    errorCode: ERROR_CODES.INTERNAL_ERROR,
    message,
    details: [],
    requestId: '',
    timestamp: new Date().toISOString(),
  };
}

async function readBlobAsText(data: Blob): Promise<string> {
  if (typeof data.text === 'function') {
    return data.text();
  }
  // jsdom / older Blob polyfills
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result ?? ''));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read blob'));
    };
    reader.readAsText(data);
  });
}

/**
 * Strip path segments and unsafe characters from Content-Disposition filenames.
 */
export function sanitizeFilename(raw: string, fallback: string): string {
  const base = raw.split(/[/\\]/).pop()?.trim() ?? '';
  if (!base) return fallback;
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_');
  if (!cleaned || cleaned === '.' || cleaned === '..') return fallback;
  if (!FILENAME_SAFE.test(cleaned.replace(/ /g, '_'))) {
    return cleaned.replace(/[^\w.-]+/g, '_') || fallback;
  }
  return cleaned;
}

export function parseContentDispositionFilename(
  disposition: unknown,
): string | null {
  if (typeof disposition !== 'string' || !disposition.trim()) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const plain = /filename="([^"]+)"/i.exec(disposition);
  if (plain?.[1]) return plain[1];
  const bare = /filename=([^;]+)/i.exec(disposition);
  return bare?.[1]?.trim().replace(/^["']|["']$/g, '') ?? null;
}

export function resolveExportContentType(
  header: unknown,
  format: 'xlsx' | 'csv' | 'pdf',
): string {
  if (typeof header === 'string' && header.trim()) {
    return header.split(';')[0]?.trim() || header.trim();
  }
  return EXPORT_MIME[format];
}

/**
 * Nest error envelopes arrive as JSON blobs when `responseType: 'blob'`.
 */
export async function parseBlobApiError(
  data: unknown,
  fallback = 'Export failed',
): Promise<ApiError> {
  if (!(data instanceof Blob)) {
    if (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      (data as ApiError).success === false
    ) {
      return data as ApiError;
    }
    return fallbackApiError(
      data instanceof Error ? data.message : fallback,
    );
  }

  const contentType = data.type || '';
  if (
    contentType.includes('sheet') ||
    contentType.includes('csv') ||
    contentType.includes('pdf') ||
    contentType.includes('octet-stream')
  ) {
    return fallbackApiError(fallback);
  }

  const text = (await readBlobAsText(data)).trim();
  if (!text) {
    return fallbackApiError(fallback);
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'success' in parsed &&
      (parsed as ApiError).success === false
    ) {
      return parsed as ApiError;
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'message' in parsed &&
      typeof (parsed as { message: unknown }).message === 'string'
    ) {
      return fallbackApiError((parsed as { message: string }).message);
    }
  } catch {
    // fall through
  }
  return fallbackApiError(text.slice(0, 280) || fallback);
}

export function isLikelyJsonErrorBlob(blob: Blob): boolean {
  const type = blob.type || '';
  return (
    type.includes('application/json') ||
    type.includes('text/plain') ||
    type.includes('text/html') ||
    type === ''
  );
}
