import { describe, expect, it } from 'vitest';
import { isMaskedAuditValue, maskSensitiveData } from './maskSensitiveData';
import { sanitizeAuditEntry } from './sanitizeAuditEntry';

describe('maskSensitiveData (client defensive)', () => {
  it('masks password and token keys (Nest last-4 recognizability)', () => {
    const masked = maskSensitiveData({
      password: 'hunter2',
      accessToken: 'tok_abc',
      pin: '12',
      name: 'Ada',
    });
    expect(masked.password).toBe('********ter2');
    expect(String(masked.accessToken)).toMatch(/^\*{8}/);
    expect(masked.pin).toBe('********');
    expect(masked.name).toBe('Ada');
  });

  it('never rehydrates already-masked backend values', () => {
    const fromApi = {
      password: '********',
      refreshToken: '********xyz1',
      email: 'a@b.co',
    };
    const again = maskSensitiveData(fromApi);
    expect(again.password).toBe('********');
    expect(again.refreshToken).toBe('********xyz1');
    expect(isMaskedAuditValue(again.refreshToken)).toBe(true);
  });

  it('sanitizeAuditEntry masks before/after without inventing fields', () => {
    const entry = sanitizeAuditEntry({
      id: 'a1',
      userId: 'u1',
      action: 'UPDATE',
      module: 'auth',
      entityType: 'session',
      entityId: 's1',
      projectId: null,
      beforeData: { password: 'plain', role: 'admin' },
      afterData: { password: '********', role: 'user' },
      requestId: 'req-1',
      timestamp: '2026-07-01T00:00:00.000Z',
    });
    expect(entry.beforeData?.password).toBe('********lain');
    expect(entry.afterData?.password).toBe('********');
    expect(entry.afterData?.role).toBe('user');
    expect(entry.requestId).toBe('req-1');
  });
});
