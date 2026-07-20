import { describe, expect, it } from 'vitest';
import { AuditAction } from '@luxaria/shared-types';
import {
  defaultAuditLogFilters,
  validateAuditLogFilters,
} from './validateFilters';

describe('validateAuditLogFilters', () => {
  it('accepts Nest action enum and actor ObjectId', () => {
    const result = validateAuditLogFilters({
      filters: {
        ...defaultAuditLogFilters('507f1f77bcf86cd799439011'),
        userId: '507f1f77bcf86cd799439012',
        action: AuditAction.UPDATE,
        module: 'investors',
        entityType: 'investor',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-12-31T23:59:59.999Z',
      },
      page: 2,
      limit: 50,
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.api).toMatchObject({
      userId: '507f1f77bcf86cd799439012',
      action: AuditAction.UPDATE,
      module: 'investors',
      projectId: '507f1f77bcf86cd799439011',
      entityType: 'investor',
      page: 2,
      limit: 50,
      sortOrder: 'desc',
    });
  });

  it('rejects unsupported action and invalid actor id', () => {
    const result = validateAuditLogFilters({
      filters: {
        ...defaultAuditLogFilters(),
        userId: 'not-an-id',
        action: 'SOFT_DELETE',
      },
      page: 1,
      limit: 20,
    });

    expect(result.fieldErrors.userId).toMatch(/ObjectId/);
    expect(result.fieldErrors.action).toMatch(/Unsupported action/);
    expect(result.api.userId).toBeUndefined();
    expect(result.api.action).toBeUndefined();
  });

  it('rejects inverted date range', () => {
    const result = validateAuditLogFilters({
      filters: {
        ...defaultAuditLogFilters(),
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      },
      page: 1,
      limit: 20,
    });
    expect(result.fieldErrors.to).toMatch(/on or after/);
  });
});
