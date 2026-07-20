import { describe, expect, it } from 'vitest';
import { selectApplicableRate } from './resolveRateOverride';
import {
  LabourCategoryRateStatus,
  LabourCategoryStatus,
  LabourSkillLevel,
  RateScopeKind,
  type PublicLabourCategory,
  type PublicLabourCategoryRate,
} from './types';

const category: PublicLabourCategory = {
  id: 'cat1',
  categoryCode: 'LBC-000001',
  name: 'Mason',
  skillLevel: LabourSkillLevel.Skilled,
  defaultDailyRate: 900,
  overtimeRate: 1350,
  status: LabourCategoryStatus.Active,
  isSystem: true,
  notes: null,
};

function rate(
  partial: Partial<PublicLabourCategoryRate> & { id: string },
): PublicLabourCategoryRate {
  return {
    labourCategoryId: 'cat1',
    projectId: null,
    contractorId: null,
    scopeKey: 'x',
    dailyRate: 0,
    overtimeRate: 0,
    effectiveDate: '2026-01-01',
    status: LabourCategoryRateStatus.Active,
    notes: null,
    ...partial,
  };
}

describe('selectApplicableRate (Phase 090)', () => {
  it('prefers project+contractor over project, contractor, and company', () => {
    const rates = [
      rate({
        id: 'r-company-like',
        projectId: null,
        contractorId: 'c1',
        dailyRate: 950,
        overtimeRate: 1400,
      }),
      rate({
        id: 'r-project',
        projectId: 'p1',
        contractorId: null,
        dailyRate: 1000,
        overtimeRate: 1500,
      }),
      rate({
        id: 'r-both',
        projectId: 'p1',
        contractorId: 'c1',
        dailyRate: 1100,
        overtimeRate: 1600,
      }),
    ];

    const selected = selectApplicableRate({
      category,
      rates,
      projectId: 'p1',
      contractorId: 'c1',
      asOf: '2026-07-01',
    });

    expect(selected.source).toBe(RateScopeKind.ProjectContractor);
    expect(selected.rate?.id).toBe('r-both');
    expect(selected.dailyRate).toBe(1100);
  });

  it('falls back to project then contractor then company defaults', () => {
    const projectOnly = selectApplicableRate({
      category,
      rates: [
        rate({
          id: 'r-project',
          projectId: 'p1',
          dailyRate: 1000,
          overtimeRate: 1500,
        }),
      ],
      projectId: 'p1',
      contractorId: 'c1',
      asOf: '2026-07-01',
    });
    expect(projectOnly.source).toBe(RateScopeKind.Project);
    expect(projectOnly.dailyRate).toBe(1000);

    const contractorOnly = selectApplicableRate({
      category,
      rates: [
        rate({
          id: 'r-contractor',
          contractorId: 'c1',
          dailyRate: 980,
          overtimeRate: 1470,
        }),
      ],
      projectId: 'p1',
      contractorId: 'c1',
      asOf: '2026-07-01',
    });
    expect(contractorOnly.source).toBe(RateScopeKind.Contractor);
    expect(contractorOnly.dailyRate).toBe(980);

    const company = selectApplicableRate({
      category,
      rates: [],
      projectId: 'p1',
      contractorId: 'c1',
      asOf: '2026-07-01',
    });
    expect(company.source).toBe(RateScopeKind.Company);
    expect(company.dailyRate).toBe(900);
    expect(company.rate).toBeNull();
  });

  it('uses latest active rate with effectiveDate ≤ asOf', () => {
    const selected = selectApplicableRate({
      category,
      rates: [
        rate({
          id: 'old',
          projectId: 'p1',
          dailyRate: 900,
          overtimeRate: 1350,
          effectiveDate: '2026-01-01',
        }),
        rate({
          id: 'current',
          projectId: 'p1',
          dailyRate: 1050,
          overtimeRate: 1575,
          effectiveDate: '2026-06-01',
        }),
        rate({
          id: 'future',
          projectId: 'p1',
          dailyRate: 1200,
          overtimeRate: 1800,
          effectiveDate: '2026-08-01',
        }),
        rate({
          id: 'inactive',
          projectId: 'p1',
          dailyRate: 2000,
          overtimeRate: 3000,
          effectiveDate: '2026-05-01',
          status: LabourCategoryRateStatus.Inactive,
        }),
      ],
      projectId: 'p1',
      asOf: '2026-07-15',
    });

    expect(selected.rate?.id).toBe('current');
    expect(selected.dailyRate).toBe(1050);
  });
});
