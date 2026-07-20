import { describe, expect, it } from 'vitest';
import { resolveDirectorCapabilities } from './roleAccess';

describe('resolveDirectorCapabilities', () => {
  it('denies all actions without permissions', () => {
    const caps = resolveDirectorCapabilities(() => false);
    expect(caps).toEqual({
      canView: false,
      canCreate: false,
      canUpdate: false,
      canUploadDocument: false,
      canViewShareholding: false,
    });
  });

  it('allows view-only when only director.view is granted', () => {
    const caps = resolveDirectorCapabilities(
      (code) => code === 'director.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(false);
    expect(caps.canUpdate).toBe(false);
    expect(caps.canUploadDocument).toBe(false);
    expect(caps.canViewShareholding).toBe(false);
  });

  it('separates create / update / upload / shareholding roles', () => {
    const caps = resolveDirectorCapabilities((code) =>
      [
        'director.view',
        'director.create',
        'director.update',
        'director.upload_document',
        'shareholding.view',
      ].includes(code),
    );
    expect(caps.canCreate).toBe(true);
    expect(caps.canUpdate).toBe(true);
    expect(caps.canUploadDocument).toBe(true);
    expect(caps.canViewShareholding).toBe(true);
  });

  it('does not treat create as update', () => {
    const caps = resolveDirectorCapabilities(
      (code) => code === 'director.view' || code === 'director.create',
    );
    expect(caps.canCreate).toBe(true);
    expect(caps.canUpdate).toBe(false);
  });
});
