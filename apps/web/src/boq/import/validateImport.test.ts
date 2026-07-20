import { describe, expect, it } from 'vitest';
import {
  missingRequiredColumns,
  validateBoqImport,
  type BoqImportRowPreview,
} from './validateImport';

function row(
  partial: Partial<BoqImportRowPreview> &
    Pick<BoqImportRowPreview, 'rowNumber' | 'boqCode'>,
): BoqImportRowPreview {
  return {
    blockCode: 'BLK-A',
    floorCode: 'FL-GF',
    categoryCode: 'WC-CIVIL',
    description: 'Sample work',
    unit: 'cubic_metre',
    plannedQuantity: 1,
    plannedValue: 100,
    ...partial,
  };
}

describe('validateBoqImport', () => {
  it('flags invalid / missing required columns', () => {
    const result = validateBoqImport({
      headers: ['blockCode', 'description', 'unit'],
      rows: [row({ rowNumber: 2, boqCode: 'BOQ-1' })],
    });
    expect(result.canCommit).toBe(false);
    expect(result.blockingCount).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.code === 'missing_column')).toBe(true);
    expect(missingRequiredColumns(['blockCode', 'description', 'unit'])).toEqual(
      expect.arrayContaining([
        'floorCode',
        'categoryCode',
        'plannedQuantity',
      ]),
    );
  });

  it('flags duplicate boq codes as blocking', () => {
    const result = validateBoqImport({
      headers: [
        'blockCode',
        'floorCode',
        'categoryCode',
        'description',
        'unit',
        'plannedQuantity',
      ],
      rows: [
        row({ rowNumber: 2, boqCode: 'BOQ-DUP' }),
        row({ rowNumber: 3, boqCode: 'boq-dup', description: 'Other' }),
      ],
    });
    expect(result.canCommit).toBe(false);
    const dupes = result.issues.filter((i) => i.code === 'duplicate_code');
    expect(dupes.length).toBe(2);
    expect(dupes[0]?.boqCode).toBe('BOQ-DUP');
  });

  it('allows commit when columns and codes are valid', () => {
    const result = validateBoqImport({
      headers: [
        'blockCode',
        'floorCode',
        'categoryCode',
        'description',
        'unit',
        'plannedQuantity',
      ],
      rows: [
        row({ rowNumber: 2, boqCode: 'BOQ-001' }),
        row({ rowNumber: 3, boqCode: 'BOQ-002', description: 'Other' }),
      ],
    });
    expect(result.canCommit).toBe(true);
    expect(result.blockingCount).toBe(0);
    expect(result.summary.rowCount).toBe(2);
    expect(result.summary.uniqueBoqCodes).toBe(2);
  });
});
