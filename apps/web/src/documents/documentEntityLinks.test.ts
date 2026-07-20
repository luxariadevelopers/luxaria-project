import { describe, expect, it } from 'vitest';
import {
  resolveDocumentEntityLink,
  toLibraryDocumentRow,
} from './documentEntityLinks';

describe('documentEntityLinks', () => {
  it('links known entity types when permitted', () => {
    const link = resolveDocumentEntityLink(
      {
        entityType: 'project',
        entityId: '507f1f77bcf86cd799439011',
        projectId: null,
      },
      { hasAnyPermission: (ps) => ps.includes('project.view') },
    );
    expect(link?.to).toBe('/projects');
  });

  it('hides links without permission', () => {
    const link = resolveDocumentEntityLink(
      {
        entityType: 'project',
        entityId: '507f1f77bcf86cd799439011',
        projectId: null,
      },
      { hasAnyPermission: () => false },
    );
    expect(link).toBeNull();
  });

  it('strips s3Key from library row copies', () => {
    const row = toLibraryDocumentRow({
      id: 'd1',
      documentCode: 'DOC-1',
      companyId: null,
      projectId: null,
      module: 'projects',
      entityType: 'project',
      entityId: '507f1f77bcf86cd799439011',
      fileName: 'a.pdf',
      originalFileName: 'a.pdf',
      mimeType: 'application/pdf',
      size: 10,
      checksum: null,
      s3Key: 'secret/key',
      uploadedBy: 'u1',
      uploadedAt: null,
      documentType: 'attachment',
      version: 1,
      status: 'active',
      malwareScanStatus: 'pending',
      previousVersionId: null,
      replaceGroupKey: null,
    });
    expect(row).not.toHaveProperty('s3Key');
    expect('s3Key' in row).toBe(false);
  });
});
