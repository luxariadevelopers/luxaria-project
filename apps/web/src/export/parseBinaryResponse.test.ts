import { describe, expect, it } from 'vitest';
import {
  parseBlobApiError,
  parseContentDispositionFilename,
  resolveExportContentType,
  sanitizeFilename,
} from './parseBinaryResponse';

describe('parseBinaryResponse', () => {
  it('sanitizes path segments and unsafe characters', () => {
    expect(sanitizeFilename('../../etc/passwd.xlsx', 'fallback.xlsx')).toBe(
      'passwd.xlsx',
    );
    expect(sanitizeFilename('report<>.xlsx', 'fallback.xlsx')).toBe(
      'report_.xlsx',
    );
  });

  it('parses Content-Disposition filenames', () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename="trial-balance-2026-07-20.xlsx"',
      ),
    ).toBe('trial-balance-2026-07-20.xlsx');
    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''finance%20dashboard.csv",
      ),
    ).toBe('finance dashboard.csv');
  });

  it('resolves MIME with format fallback', () => {
    expect(resolveExportContentType('text/csv; charset=utf-8', 'csv')).toBe(
      'text/csv',
    );
    expect(resolveExportContentType(undefined, 'xlsx')).toContain(
      'spreadsheetml',
    );
  });

  it('parses JSON error blobs from failed binary exports', async () => {
    const blob = new Blob(
      [
        JSON.stringify({
          success: false,
          message: 'Missing permission report.export',
          errorCode: 'FORBIDDEN',
        }),
      ],
      { type: 'application/json' },
    );
    const err = await parseBlobApiError(blob, 'Export failed');
    expect(err.success).toBe(false);
    expect(err.message).toMatch(/report\.export/i);
  });
});
