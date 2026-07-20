import { describe, expect, it } from 'vitest';
import type { UserAccess } from '@/api/types';
import {
  hasInvestorPortalAccess,
  isInvestorOnlySession,
} from './session';

function makeAccess(overrides: Partial<UserAccess> & Pick<UserAccess, 'permissions'>): UserAccess {
  return {
    userId: 'user-1',
    roleIds: ['role-1'],
    roleCodes: ['INVESTOR'],
    bypassPermissions: false,
    ...overrides,
  };
}

describe('investor portal session helpers', () => {
  it('detects investor portal access from investor_portal.view', () => {
    const access = makeAccess({ permissions: ['investor_portal.view'] });
    expect(hasInvestorPortalAccess(access)).toBe(true);
  });

  it('treats INVESTOR role sessions as investor-only', () => {
    const access = makeAccess({
      roleCodes: ['INVESTOR'],
      permissions: ['investor.view', 'investor_portal.view', 'notification.view'],
    });
    expect(isInvestorOnlySession(access)).toBe(true);
  });

  it('does not treat staff ERP users as investor-only', () => {
    const access = makeAccess({
      roleCodes: ['PROJECT_MANAGER'],
      permissions: ['project.view', 'investor_portal.manage', 'investor_portal.view'],
    });
    expect(isInvestorOnlySession(access)).toBe(false);
  });

  it('blocks users without investor_portal.view', () => {
    const access = makeAccess({
      roleCodes: ['INVESTOR'],
      permissions: ['investor.view'],
    });
    expect(hasInvestorPortalAccess(access)).toBe(false);
    expect(isInvestorOnlySession(access)).toBe(false);
  });
});
