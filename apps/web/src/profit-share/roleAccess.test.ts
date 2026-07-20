import { describe, expect, it } from 'vitest';
import { resolveProfitShareCapabilities } from './roleAccess';

describe('resolveProfitShareCapabilities', () => {
  it('maps profit_share.* prompt aliases to project_participant.* codes', () => {
    const caps = resolveProfitShareCapabilities((code) =>
      [
        'project_participant.view',
        'project_participant.create',
        'project_participant.submit',
        'project_participant.approve',
      ].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canSubmit).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canUpdate).toBe(false);
  });
});
