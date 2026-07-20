import { describe, expect, it } from 'vitest';
import { resolveCommitmentCapabilities } from './roleAccess';

describe('resolveCommitmentCapabilities', () => {
  it('maps Nest contribution_commitment.* codes (not commitment.*)', () => {
    const caps = resolveCommitmentCapabilities((code) =>
      [
        'contribution_commitment.view',
        'contribution_commitment.create',
        'contribution_commitment.submit',
        'contribution_commitment.approve',
      ].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canSubmit).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canAmend).toBe(false);
    expect(caps.canCancel).toBe(false);
    expect(caps.canRecordReceipt).toBe(false);
  });

  it('denies when only alias commitment.view is granted', () => {
    const caps = resolveCommitmentCapabilities(
      (code) => code === 'commitment.view',
    );
    expect(caps.canView).toBe(false);
  });
});
