import { describe, expect, it, vi } from 'vitest';
import {
  FINANCIAL_YEAR_PERMISSIONS,
  resolveFinancialYearCapabilities,
} from './permissions';

describe('financial year permissions', () => {
  it('queries exactly the three controller permission codes', () => {
    const hasPermission = vi.fn((permission: string) =>
      [
        FINANCIAL_YEAR_PERMISSIONS.view,
        FINANCIAL_YEAR_PERMISSIONS.unlock,
      ].includes(
        permission as (typeof FINANCIAL_YEAR_PERMISSIONS)[keyof typeof FINANCIAL_YEAR_PERMISSIONS],
      ),
    );

    expect(resolveFinancialYearCapabilities(hasPermission)).toEqual({
      canView: true,
      canManage: false,
      canApproveUnlock: true,
    });
    expect(hasPermission.mock.calls.map(([permission]) => permission)).toEqual([
      'financial_year.view',
      'financial_year.manage',
      'financial_year.unlock',
    ]);
  });

  it('does not imply manage or unlock from view', () => {
    const capabilities = resolveFinancialYearCapabilities(
      (permission) => permission === 'financial_year.view',
    );

    expect(capabilities.canView).toBe(true);
    expect(capabilities.canManage).toBe(false);
    expect(capabilities.canApproveUnlock).toBe(false);
  });
});
