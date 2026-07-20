import { BadRequestException } from '@nestjs/common';
import {
  assertNonNegativeRate,
  assertScopedRateTargets,
  buildRateScopeKey,
  resolveRateScopeKind,
} from './labour-categories.validation';

describe('labour-categories.validation', () => {
  it('builds scope keys for project / contractor combinations', () => {
    expect(
      buildRateScopeKey({
        labourCategoryId: 'cat1',
        projectId: 'p1',
        contractorId: 'c1',
      }),
    ).toBe('cat:cat1|p:p1|c:c1');

    expect(
      buildRateScopeKey({
        labourCategoryId: 'cat1',
        projectId: 'p1',
      }),
    ).toBe('cat:cat1|p:p1|c:g');

    expect(
      buildRateScopeKey({
        labourCategoryId: 'cat1',
        contractorId: 'c1',
      }),
    ).toBe('cat:cat1|p:g|c:c1');
  });

  it('classifies rate scope kinds', () => {
    expect(
      resolveRateScopeKind({ projectId: 'p', contractorId: 'c' }),
    ).toBe('project_contractor');
    expect(resolveRateScopeKind({ projectId: 'p' })).toBe('project');
    expect(resolveRateScopeKind({ contractorId: 'c' })).toBe('contractor');
    expect(resolveRateScopeKind({})).toBe('company');
  });

  it('requires project or contractor for rate overrides', () => {
    expect(() => assertScopedRateTargets({})).toThrow(BadRequestException);
    expect(() =>
      assertScopedRateTargets({ projectId: 'p1' }),
    ).not.toThrow();
  });

  it('validates non-negative rates', () => {
    expect(() => assertNonNegativeRate(0, 'dailyRate')).not.toThrow();
    expect(() => assertNonNegativeRate(-1, 'dailyRate')).toThrow(
      BadRequestException,
    );
  });
});
