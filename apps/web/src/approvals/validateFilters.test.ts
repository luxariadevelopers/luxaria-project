import { describe, expect, it } from 'vitest';
import { ApprovalStatus } from '@luxaria/shared-types';
import {
  defaultApprovalInboxFilters,
  validateApprovalInboxFilters,
} from './validateFilters';

describe('validateApprovalInboxFilters', () => {
  it('keeps supported status/module/entityType and clamps pagination', () => {
    const result = validateApprovalInboxFilters({
      filters: {
        ...defaultApprovalInboxFilters('507f1f77bcf86cd799439011'),
        status: ApprovalStatus.Pending,
        module: 'purchase',
        entityType: 'purchase_order',
      },
      page: 0,
      limit: 500,
    });

    expect(result.api.page).toBe(1);
    expect(result.api.limit).toBe(100);
    expect(result.api.status).toBe(ApprovalStatus.Pending);
    expect(result.api.module).toBe('purchase');
    expect(result.api.entityType).toBe('purchase_order');
    expect(result.fieldErrors).toEqual({});
  });

  it('rejects unsupported status and ageing (not sent / not applied)', () => {
    const result = validateApprovalInboxFilters({
      filters: {
        ...defaultApprovalInboxFilters(),
        status: 'waiting_on_me',
        ageing: 'critical',
      },
      page: 1,
      limit: 20,
    });

    expect(result.api.status).toBeUndefined();
    expect(result.client.ageing).toBeNull();
    expect(result.fieldErrors.status).toMatch(/Unsupported status/);
    expect(result.fieldErrors.ageing).toMatch(/Unsupported ageing/);
  });

  it('validates amount range client-side only', () => {
    const result = validateApprovalInboxFilters({
      filters: {
        ...defaultApprovalInboxFilters(),
        minAmount: '1000',
        maxAmount: '500',
      },
      page: 1,
      limit: 20,
    });

    expect(result.fieldErrors.maxAmount).toMatch(/Max amount/);
    expect(result.api).not.toHaveProperty('minAmount');
  });

  it('rejects invalid project ObjectId', () => {
    const result = validateApprovalInboxFilters({
      filters: {
        ...defaultApprovalInboxFilters('not-an-object-id'),
      },
      page: 1,
      limit: 20,
    });

    expect(result.fieldErrors.projectId).toMatch(/ObjectId/);
  });
});
