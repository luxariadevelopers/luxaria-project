import { describe, expect, it } from 'vitest';
import {
  resolveBankAccountCapabilities,
  resolveBankAccountManageActions,
} from './roleAccess';

describe('resolveBankAccountCapabilities', () => {
  it('maps Nest bank.* permissions (not bank_account.*)', () => {
    const caps = resolveBankAccountCapabilities((code) =>
      ['bank.view', 'bank.manage'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canManage).toBe(true);
    expect(caps.canViewSensitive).toBe(true);
  });

  it('allows sensitive via bank.view_sensitive without manage', () => {
    const caps = resolveBankAccountCapabilities((code) =>
      ['bank.view', 'bank.view_sensitive'].includes(code),
    );
    expect(caps.canManage).toBe(false);
    expect(caps.canViewSensitive).toBe(true);
  });

  it('denies all when permissions missing', () => {
    const caps = resolveBankAccountCapabilities(() => false);
    expect(caps).toEqual({
      canView: false,
      canManage: false,
      canViewSensitive: false,
    });
  });

  it('ignores invented bank_account.* aliases', () => {
    const caps = resolveBankAccountCapabilities((code) =>
      [
        'bank_account.view',
        'bank_account.create',
        'bank_account.update',
        'bank_account.view_sensitive',
      ].includes(code),
    );
    expect(caps.canView).toBe(false);
    expect(caps.canManage).toBe(false);
    expect(caps.canViewSensitive).toBe(false);
  });
});

describe('resolveBankAccountManageActions', () => {
  const manage = { canManage: true };
  const viewOnly = { canManage: false };

  it('returns no actions without bank.manage', () => {
    expect(resolveBankAccountManageActions('active', viewOnly)).toEqual([]);
  });

  it('allows deactivate and set_default only when active', () => {
    expect(resolveBankAccountManageActions('active', manage)).toEqual([
      'edit',
      'deactivate',
      'set_default',
    ]);
  });

  it('allows activate only when inactive', () => {
    expect(resolveBankAccountManageActions('inactive', manage)).toEqual([
      'edit',
      'activate',
    ]);
  });
});
