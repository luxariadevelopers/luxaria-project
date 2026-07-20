import { describe, expect, it } from 'vitest';
import { DocumentStatus } from '@luxaria/shared-types';
import {
  defaultDocumentLibraryFilters,
  validateDocumentLibraryFilters,
} from './validateLibraryFilters';

describe('validateDocumentLibraryFilters', () => {
  it('requires entityType + entityId ObjectId before listing', () => {
    const result = validateDocumentLibraryFilters({
      filters: defaultDocumentLibraryFilters(),
      page: 1,
      limit: 20,
    });
    expect(result.ready).toBe(false);
    expect(result.api).toBeNull();
    expect(result.fieldErrors.entityType).toBeTruthy();
    expect(result.fieldErrors.entityId).toBeTruthy();
  });

  it('builds Nest list query with clamped pagination', () => {
    const result = validateDocumentLibraryFilters({
      filters: {
        ...defaultDocumentLibraryFilters('507f1f77bcf86cd799439011'),
        entityType: 'project',
        entityId: '507f1f77bcf86cd799439012',
        module: 'projects',
        status: DocumentStatus.Active,
      },
      page: 0,
      limit: 500,
    });

    expect(result.ready).toBe(true);
    expect(result.api).toEqual({
      entityType: 'project',
      entityId: '507f1f77bcf86cd799439012',
      module: 'projects',
      projectId: '507f1f77bcf86cd799439011',
      status: DocumentStatus.Active,
      page: 1,
      limit: 100,
    });
  });

  it('rejects unsupported document status', () => {
    const result = validateDocumentLibraryFilters({
      filters: {
        ...defaultDocumentLibraryFilters(),
        entityType: 'project',
        entityId: '507f1f77bcf86cd799439012',
        status: 'published',
      },
      page: 1,
      limit: 20,
    });
    expect(result.ready).toBe(false);
    expect(result.fieldErrors.status).toMatch(/Unsupported status/);
  });
});
