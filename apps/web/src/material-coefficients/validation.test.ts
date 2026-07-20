import { describe, expect, it } from 'vitest';
import { BoqUnit } from './units';
import {
  assertBoqOrWorkType,
  assertNoOpenVersionForScope,
  assertQuantityAndWastage,
  buildScopeKey,
  defaultCoefficientFormValues,
  effectiveQuantityPerUnit,
  normalizeWorkType,
  validateCreateAgainstExisting,
  validateVersionCreateAgainstExisting,
} from './validation';
import {
  MaterialCoefficientStatus,
  type PublicMaterialCoefficient,
} from './types';

const MATERIAL_ID = '507f1f77bcf86cd799439011';
const PROJECT_ID = '507f1f77bcf86cd799439012';
const BOQ_ITEM_ID = '507f1f77bcf86cd799439013';

function sampleRow(
  overrides: Partial<PublicMaterialCoefficient> = {},
): PublicMaterialCoefficient {
  return {
    id: '507f1f77bcf86cd799439099',
    standardNumber: 'MCS-2026-000001',
    scopeKey: buildScopeKey({
      workType: 'Brick masonry',
      materialId: MATERIAL_ID,
      outputUnit: BoqUnit.SquareFoot,
    }),
    projectId: null,
    isProjectOverride: false,
    overridesStandardId: null,
    boqItemId: null,
    workType: 'Brick masonry',
    outputUnit: BoqUnit.SquareFoot,
    materialId: MATERIAL_ID,
    materialCode: 'BRK',
    materialName: 'Brick',
    quantityPerUnit: 8,
    wastagePercentage: 5,
    effectiveQuantityPerUnit: 8.4,
    effectiveDate: '2026-07-01',
    version: 1,
    status: MaterialCoefficientStatus.Active,
    basedOnStandardId: null,
    submittedBy: null,
    submittedAt: null,
    approvalReference: null,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    notes: null,
    ...overrides,
  };
}

describe('assertQuantityAndWastage', () => {
  it('requires positive quantityPerUnit', () => {
    expect(assertQuantityAndWastage(0, 5).ok).toBe(false);
    expect(assertQuantityAndWastage(-1, 5).ok).toBe(false);
    expect(assertQuantityAndWastage(8, 5).ok).toBe(true);
  });

  it('requires wastage between 0 and 100', () => {
    expect(assertQuantityAndWastage(8, -1).ok).toBe(false);
    expect(assertQuantityAndWastage(8, 101).ok).toBe(false);
    expect(assertQuantityAndWastage(8, 0).ok).toBe(true);
    expect(assertQuantityAndWastage(8, 100).ok).toBe(true);
  });
});

describe('assertBoqOrWorkType', () => {
  it('requires boqItemId or workType', () => {
    expect(assertBoqOrWorkType({}).ok).toBe(false);
    expect(assertBoqOrWorkType({ workType: 'Brick masonry' }).ok).toBe(true);
    expect(assertBoqOrWorkType({ boqItemId: BOQ_ITEM_ID }).ok).toBe(true);
  });
});

describe('buildScopeKey', () => {
  it('builds global and project scope keys', () => {
    const globalKey = buildScopeKey({
      workType: 'Brick masonry',
      materialId: MATERIAL_ID,
      outputUnit: BoqUnit.SquareFoot,
    });
    const projectKey = buildScopeKey({
      projectId: PROJECT_ID,
      workType: 'Brick masonry',
      materialId: MATERIAL_ID,
      outputUnit: BoqUnit.SquareFoot,
    });
    expect(globalKey).toContain('g|');
    expect(projectKey).toContain(`p:${PROJECT_ID}`);
    expect(globalKey).not.toBe(projectKey);
  });

  it('normalizes workType whitespace', () => {
    expect(normalizeWorkType('  Brick   masonry ')).toBe('Brick masonry');
  });

  it('computes effective quantity with wastage', () => {
    expect(effectiveQuantityPerUnit(8, 5)).toBe(8.4);
  });
});

describe('version / overlapping rules (client preview)', () => {
  it('blocks create when open draft exists for scope', () => {
    const existing = [
      sampleRow({
        id: 'open-draft',
        status: MaterialCoefficientStatus.Draft,
      }),
    ];
    const values = {
      ...defaultCoefficientFormValues(),
      workType: 'Brick masonry',
      materialId: MATERIAL_ID,
      quantityPerUnit: 8,
      wastagePercentage: 5,
    };
    const result = validateCreateAgainstExisting(values, existing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/open draft/i);
    }
  });

  it('blocks create when pending approval exists for scope', () => {
    const scopeKey = buildScopeKey({
      workType: 'Plaster',
      materialId: MATERIAL_ID,
      outputUnit: BoqUnit.SquareFoot,
    });
    const existing = [
      sampleRow({
        scopeKey,
        workType: 'Plaster',
        status: MaterialCoefficientStatus.PendingApproval,
      }),
    ];
    const values = {
      ...defaultCoefficientFormValues(),
      workType: 'Plaster',
      materialId: MATERIAL_ID,
      quantityPerUnit: 2,
      wastagePercentage: 3,
    };
    expect(validateCreateAgainstExisting(values, existing).ok).toBe(false);
  });

  it('allows create when only superseded exists for scope', () => {
    const existing = [
      sampleRow({ status: MaterialCoefficientStatus.Superseded }),
    ];
    const values = {
      ...defaultCoefficientFormValues(),
      workType: 'Brick masonry',
      materialId: MATERIAL_ID,
      quantityPerUnit: 8,
      wastagePercentage: 5,
    };
    expect(validateCreateAgainstExisting(values, existing).ok).toBe(true);
  });

  it('assertNoOpenVersionForScope excludes current row on edit', () => {
    const row = sampleRow({
      id: 'draft-self',
      status: MaterialCoefficientStatus.Draft,
    });
    expect(
      assertNoOpenVersionForScope(row.scopeKey, [row], row.id).ok,
    ).toBe(true);
  });

  it('blocks version create from open source', () => {
    const source = sampleRow({ status: MaterialCoefficientStatus.Draft });
    expect(validateVersionCreateAgainstExisting(source, []).ok).toBe(false);
  });

  it('blocks version create when another open version exists', () => {
    const scopeKey = buildScopeKey({
      workType: 'Brick masonry',
      materialId: MATERIAL_ID,
      outputUnit: BoqUnit.SquareFoot,
    });
    const active = sampleRow({ status: MaterialCoefficientStatus.Active });
    const pending = sampleRow({
      id: 'pending',
      status: MaterialCoefficientStatus.PendingApproval,
      scopeKey,
    });
    expect(validateVersionCreateAgainstExisting(active, [pending]).ok).toBe(
      false,
    );
  });
});
