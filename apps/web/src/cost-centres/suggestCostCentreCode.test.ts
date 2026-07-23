import { describe, expect, it } from 'vitest';
import {
  costCentreCodePrefix,
  nextSequenceFromCodes,
  projectShortForm,
  suggestCostCentreCode,
} from './suggestCostCentreCode';

describe('suggestCostCentreCode', () => {
  it('shortens project name to 6 alphanumeric chars', () => {
    expect(projectShortForm('Madambakkam Residency', 'PRJ-20260001')).toBe(
      'MADAMB',
    );
    expect(projectShortForm(null, 'PRJ-20260001')).toBe('202600');
    expect(projectShortForm(null, null)).toBe('GEN');
  });

  it('builds LUX-year-project-CC|PC prefix', () => {
    expect(
      costCentreCodePrefix('Madambakkam', 'PRJ-1', 'cost_centre', 2026),
    ).toBe('LUX-2026-MADAMB-CC');
    expect(
      costCentreCodePrefix('Madambakkam', 'PRJ-1', 'profit_centre', 2026),
    ).toBe('LUX-2026-MADAMB-PC');
  });

  it('sequences CC and PC separately', () => {
    expect(
      nextSequenceFromCodes('LUX-2026-MADAMB-CC', [
        'LUX-2026-MADAMB-CC-001',
        'LUX-2026-MADAMB-CC-002',
        'LUX-2026-MADAMB-PC-009',
      ]),
    ).toBe(3);
    expect(
      nextSequenceFromCodes('LUX-2026-MADAMB-PC', [
        'LUX-2026-MADAMB-CC-001',
        'LUX-2026-MADAMB-PC-001',
      ]),
    ).toBe(2);
  });

  it('suggests LUX-year-project-CC|PC-number', () => {
    expect(
      suggestCostCentreCode({
        projectName: 'Madambakkam',
        projectCode: 'PRJ-20260001',
        kind: 'cost_centre',
        year: 2026,
        existingCodes: ['LUX-2026-MADAMB-CC-001'],
      }),
    ).toBe('LUX-2026-MADAMB-CC-002');
    expect(
      suggestCostCentreCode({
        projectName: 'Madambakkam',
        kind: 'profit_centre',
        year: 2026,
        existingCodes: [],
      }),
    ).toBe('LUX-2026-MADAMB-PC-001');
  });
});
