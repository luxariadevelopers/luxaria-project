import { describe, expect, it } from 'vitest';
import { resolvePeriodCloseCapabilities } from './roleAccess';

describe('resolvePeriodCloseCapabilities', () => {
  it('maps Nest period_closure.* permissions (not period_close.*)', () => {
    const caps = resolvePeriodCloseCapabilities((code) =>
      [
        'period_closure.view',
        'period_closure.manage',
        'period_closure.reopen',
        'period_closure.approve_reopen',
      ].includes(code),
    );
    expect(caps).toEqual({
      canView: true,
      canManage: true,
      canLock: true,
      canReopen: true,
      canApproveReopen: true,
    });
  });

  it('denies lock without period_closure.manage', () => {
    const caps = resolvePeriodCloseCapabilities(
      (code) => code === 'period_closure.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canLock).toBe(false);
    expect(caps.canManage).toBe(false);
  });
});
