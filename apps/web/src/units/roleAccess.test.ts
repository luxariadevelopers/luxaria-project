import { describe, expect, it } from 'vitest';
import { resolveUnitCapabilities } from './roleAccess';

describe('resolveUnitCapabilities', () => {
  it('maps Nest unit.view / unit.manage (+ booking/document)', () => {
    const caps = resolveUnitCapabilities((code) =>
      [
        'unit.view',
        'unit.manage',
        'booking.view',
        'document.view',
        'document.upload',
      ].includes(code),
    );
    expect(caps).toEqual({
      canView: true,
      canCreate: true,
      canUpdate: true,
      canBlock: true,
      canChangeStatus: true,
      canManage: true,
      canViewBookings: true,
      canViewDocuments: true,
      canUploadDocuments: true,
    });
  });

  it('does not invent unit.create / unit.update / unit.block Nest codes', () => {
    const caps = resolveUnitCapabilities((code) =>
      ['unit.create', 'unit.update', 'unit.block'].includes(code),
    );
    expect(caps.canView).toBe(false);
    expect(caps.canCreate).toBe(false);
    expect(caps.canUpdate).toBe(false);
    expect(caps.canBlock).toBe(false);
  });

  it('allows view without manage', () => {
    const caps = resolveUnitCapabilities((code) => code === 'unit.view');
    expect(caps.canView).toBe(true);
    expect(caps.canManage).toBe(false);
    expect(caps.canChangeStatus).toBe(false);
  });
});
