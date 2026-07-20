import { describe, expect, it } from 'vitest';
import { toFinanceDashboardQuery } from './FinanceFilters';

describe('toFinanceDashboardQuery', () => {
  it('requires financial year and omits empty project', () => {
    expect(
      toFinanceDashboardQuery({
        date: '2026-07-20',
        projectId: '',
        financialYearId: 'fy1',
        horizonDays: '45',
      }),
    ).toEqual({
      date: '2026-07-20',
      financialYearId: 'fy1',
      horizonDays: 45,
    });
  });

  it('includes optional projectId when set', () => {
    expect(
      toFinanceDashboardQuery({
        date: '2026-07-20',
        projectId: 'p1',
        financialYearId: 'fy1',
        horizonDays: '30',
      }).projectId,
    ).toBe('p1');
  });

  it('drops invalid horizon', () => {
    expect(
      toFinanceDashboardQuery({
        date: '2026-07-20',
        projectId: '',
        financialYearId: 'fy1',
        horizonDays: '999',
      }).horizonDays,
    ).toBeUndefined();
  });
});
