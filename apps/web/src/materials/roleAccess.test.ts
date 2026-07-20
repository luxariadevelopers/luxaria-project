import { describe, expect, it } from 'vitest';
import { resolveMaterialCapabilities } from './roleAccess';

describe('resolveMaterialCapabilities', () => {
  it('maps Nest material.view / material.manage / stock.view', () => {
    const caps = resolveMaterialCapabilities((code) =>
      ['material.view', 'material.manage', 'stock.view'].includes(code),
    );
    expect(caps).toEqual({
      canView: true,
      canManage: true,
      canViewStock: true,
    });
  });

  it('does not invent material.update — manage is required to edit', () => {
    const caps = resolveMaterialCapabilities((code) =>
      code === 'material.update',
    );
    expect(caps.canView).toBe(false);
    expect(caps.canManage).toBe(false);
  });

  it('allows view without stock', () => {
    const caps = resolveMaterialCapabilities((code) => code === 'material.view');
    expect(caps.canView).toBe(true);
    expect(caps.canViewStock).toBe(false);
    expect(caps.canManage).toBe(false);
  });
});
