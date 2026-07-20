import { describe, expect, it } from 'vitest';
import { FINANCE_DASHBOARD_MAX_HORIZON_DAYS } from './constants';
import type { ExportDescriptor } from './types';
import {
  defaultExportFormValues,
  validateExportForm,
} from './validateExportForm';

function baseDescriptor(
  overrides: Partial<ExportDescriptor> = {},
): ExportDescriptor {
  return {
    id: 'test',
    title: 'Test export',
    permission: 'report.export',
    allowedFormats: ['xlsx', 'csv'],
    defaultFormat: 'xlsx',
    showDateRange: true,
    showHorizonDays: true,
    maxRangeDays: 90,
    requiredFilters: [{ key: 'projectId', label: 'Project id' }],
    fallbackFilename: 'test.xlsx',
    fetchBinary: async () => ({
      blob: new Blob(),
      filename: 'test.xlsx',
      contentType: 'application/octet-stream',
    }),
    ...overrides,
  };
}

describe('validateExportForm', () => {
  it('rejects from after to', () => {
    const descriptor = baseDescriptor();
    const values = {
      ...defaultExportFormValues(descriptor),
      from: '2026-07-20',
      to: '2026-07-01',
      projectId: '507f1f77bcf86cd799439011',
    };
    const result = validateExportForm(descriptor, values);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.to).toMatch(/on or before/i);
    }
  });

  it('rejects date ranges beyond maxRangeDays', () => {
    const descriptor = baseDescriptor({ maxRangeDays: 10 });
    const values = {
      ...defaultExportFormValues(descriptor),
      from: '2026-07-01',
      to: '2026-07-20',
      projectId: '507f1f77bcf86cd799439011',
    };
    const result = validateExportForm(descriptor, values);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.to).toMatch(/10 days/i);
    }
  });

  it('rejects horizonDays above backend max', () => {
    const descriptor = baseDescriptor({ requiredFilters: [] });
    const values = {
      ...defaultExportFormValues(descriptor),
      horizonDays: String(FINANCE_DASHBOARD_MAX_HORIZON_DAYS + 1),
    };
    const result = validateExportForm(descriptor, values);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.horizonDays).toMatch(/180/);
    }
  });

  it('requires declared filters', () => {
    const descriptor = baseDescriptor();
    const values = defaultExportFormValues(descriptor);
    const result = validateExportForm(descriptor, values);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.projectId).toMatch(/required/i);
    }
  });

  it('accepts a valid export form', () => {
    const descriptor = baseDescriptor({ requiredFilters: [] });
    const values = {
      ...defaultExportFormValues(descriptor),
      from: '2026-07-01',
      to: '2026-07-10',
      horizonDays: '30',
    };
    expect(validateExportForm(descriptor, values)).toEqual({
      ok: true,
      values: expect.objectContaining({
        from: '2026-07-01',
        to: '2026-07-10',
      }),
    });
  });
});
