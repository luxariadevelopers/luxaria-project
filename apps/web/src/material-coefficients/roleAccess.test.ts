import { describe, expect, it } from 'vitest';
import { resolveMaterialCoefficientCapabilities } from './roleAccess';

describe('material coefficient roleAccess', () => {
  it('uses material_consumption.* catalog codes only', () => {
    const caps = resolveMaterialCoefficientCapabilities((code) =>
      [
        'material_consumption.view',
        'material_consumption.manage',
        'material_consumption.approve',
      ].includes(code),
    );
    expect(caps).toEqual({
      canView: true,
      canManage: true,
      canApprove: true,
    });
  });
});
