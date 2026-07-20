import { BadRequestException } from '@nestjs/common';
import { BoqUnit } from '../boq/schemas/boq.schema';
import {
  assertBoqOrWorkType,
  buildScopeKey,
  effectiveQuantityPerUnit,
  normalizeWorkType,
} from './material-consumption-standard.validation';

describe('material-consumption-standard.validation', () => {
  it('requires boqItemId or workType', () => {
    expect(() => assertBoqOrWorkType({})).toThrow(BadRequestException);
    expect(() =>
      assertBoqOrWorkType({ workType: 'Brick masonry' }),
    ).not.toThrow();
    expect(() =>
      assertBoqOrWorkType({ boqItemId: '507f1f77bcf86cd799439011' }),
    ).not.toThrow();
  });

  it('builds distinct global and project scope keys', () => {
    const materialId = '507f1f77bcf86cd799439011';
    const globalKey = buildScopeKey({
      workType: 'Brick masonry',
      materialId,
      outputUnit: BoqUnit.SquareFoot,
    });
    const projectKey = buildScopeKey({
      projectId: '507f1f77bcf86cd799439012',
      workType: 'Brick masonry',
      materialId,
      outputUnit: BoqUnit.SquareFoot,
    });
    expect(globalKey).toContain('g|');
    expect(globalKey).toContain('wt:brick masonry');
    expect(projectKey).toContain('p:507f1f77bcf86cd799439012');
    expect(globalKey).not.toBe(projectKey);
  });

  it('normalizes workType whitespace', () => {
    expect(normalizeWorkType('  Brick   masonry ')).toBe('Brick masonry');
  });

  it('computes effective quantity with wastage', () => {
    // 8 bricks + 5% wastage = 8.4
    expect(effectiveQuantityPerUnit(8, 5)).toBe(8.4);
  });
});
