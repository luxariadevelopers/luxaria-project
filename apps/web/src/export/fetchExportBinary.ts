import axios from 'axios';
import { apiClient } from '@/api/client';
import {
  parseBlobApiError,
  parseContentDispositionFilename,
  resolveExportContentType,
  sanitizeFilename,
} from './parseBinaryResponse';
import type { ExportFormat } from './types';

export type FetchExportBinaryArgs = {
  url: string;
  params?: Record<string, string | number | undefined>;
  format: ExportFormat;
  fallbackFilename: string;
};

/**
 * GET a Nest binary export with safe filename / MIME handling.
 * Converts JSON-in-blob error bodies into rejected ApiError-shaped values.
 */
export async function fetchExportBinary(
  args: FetchExportBinaryArgs,
): Promise<{ blob: Blob; filename: string; contentType: string }> {
  try {
    const response = await apiClient.get<Blob>(args.url, {
      params: omitUndefined(args.params),
      responseType: 'blob',
    });

    const blob = response.data;
    if (!(blob instanceof Blob)) {
      throw {
        success: false as const,
        message: 'Export response was not a binary file',
      };
    }

    const headerType =
      typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type']
        : '';
    if (headerType.includes('application/json')) {
      throw await parseBlobApiError(blob, 'Export failed');
    }

    const headerName = parseContentDispositionFilename(
      response.headers['content-disposition'],
    );
    const withExt = ensureExtension(
      headerName ?? args.fallbackFilename,
      args.format,
    );
    const filename = sanitizeFilename(withExt, args.fallbackFilename);
    const contentType = resolveExportContentType(headerType, args.format);

    return {
      blob: new Blob([blob], { type: contentType }),
      filename,
      contentType,
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      throw await parseBlobApiError(
        err.response.data,
        err.message || 'Export failed',
      );
    }
    throw err;
  }
}

function ensureExtension(name: string, format: ExportFormat): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(`.${format}`)) return name;
  if (format === 'xlsx' && (lower.endsWith('.xls') || lower.endsWith('.xlsx'))) {
    return name;
  }
  return `${name}.${format}`;
}

function omitUndefined(
  params?: Record<string, string | number | undefined>,
): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      out[key] = value;
    }
  }
  return out;
}
