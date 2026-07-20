import { describe, expect, it } from 'vitest';
import { resolveGrnCapabilities } from './roleAccess';

describe('resolveGrnCapabilities', () => {
  it('maps Nest grn.create to view/create/cancel', () => {
    const caps = resolveGrnCapabilities((code) => code === 'grn.create');
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canCancel).toBe(true);
    expect(caps.canQc).toBe(false);
    expect(caps.canAccept).toBe(false);
    expect(caps.canPost).toBe(false);
  });

  it('maps Nest grn.approve to qc/accept/post', () => {
    const caps = resolveGrnCapabilities((code) => code === 'grn.approve');
    expect(caps.canView).toBe(false);
    expect(caps.canQc).toBe(true);
    expect(caps.canAccept).toBe(true);
    expect(caps.canPost).toBe(true);
  });
});
