import { describe, expect, it } from 'vitest';
import { PurchaseOrderStatus } from './types';
import {
  defaultPurchaseOrderFilters,
  validatePurchaseOrderFilters,
} from './validateFilters';

const PROJECT = '507f1f77bcf86cd799439011';

describe('validatePurchaseOrderFilters', () => {
  it('accepts Nest purchase order statuses', () => {
    for (const status of Object.values(PurchaseOrderStatus)) {
      const result = validatePurchaseOrderFilters({
        filters: { ...defaultPurchaseOrderFilters(), status },
        page: 1,
        limit: 20,
        projectId: PROJECT,
      });
      expect(result.ready).toBe(true);
      expect(result.api.status).toBe(status);
    }
  });

  it('rejects invented status values', () => {
    const result = validatePurchaseOrderFilters({
      filters: { ...defaultPurchaseOrderFilters(), status: 'issued_pending' },
      page: 1,
      limit: 20,
      projectId: PROJECT,
    });
    expect(result.ready).toBe(false);
    expect(result.fieldErrors.status).toBeTruthy();
    expect(result.api.status).toBeUndefined();
  });

  it('requires a valid project ObjectId', () => {
    const result = validatePurchaseOrderFilters({
      filters: defaultPurchaseOrderFilters(),
      page: 1,
      limit: 20,
      projectId: 'not-an-id',
    });
    expect(result.ready).toBe(false);
    expect(result.api.projectId).toBeUndefined();
  });

  it('passes search and optional ObjectId filters', () => {
    const vendorId = '507f1f77bcf86cd799439022';
    const purchaseRequestId = '507f1f77bcf86cd799439033';
    const result = validatePurchaseOrderFilters({
      filters: {
        status: PurchaseOrderStatus.Issued,
        search: 'PO-2026',
        vendorId,
        purchaseRequestId,
      },
      page: 2,
      limit: 50,
      projectId: PROJECT,
    });
    expect(result.ready).toBe(true);
    expect(result.api).toMatchObject({
      page: 2,
      limit: 50,
      projectId: PROJECT,
      status: PurchaseOrderStatus.Issued,
      search: 'PO-2026',
      vendorId,
      purchaseRequestId,
    });
  });
});
