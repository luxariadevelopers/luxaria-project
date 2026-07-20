import { describe, expect, it } from 'vitest';
import {
  resolvePortalDocumentDownload,
  resolveReceiptDownload,
} from './documentDownload';

describe('resolvePortalDocumentDownload', () => {
  it('allows S3 ObjectId when portal view and document.download are present', () => {
    expect(
      resolvePortalDocumentDownload('507f1f77bcf86cd799439011', true),
    ).toEqual({ canDownload: true });
  });

  it('blocks ObjectId without document.download', () => {
    expect(
      resolvePortalDocumentDownload('507f1f77bcf86cd799439011', false),
    ).toMatchObject({ canDownload: false });
  });

  it('blocks local upload paths (no portal endpoint)', () => {
    expect(
      resolvePortalDocumentDownload('uploads/agreements/a.pdf', true),
    ).toMatchObject({ canDownload: false });
  });
});

describe('resolveReceiptDownload', () => {
  it('never enables download via staff receipt endpoints', () => {
    expect(resolveReceiptDownload(true, true)).toMatchObject({
      canDownload: false,
    });
    expect(resolveReceiptDownload(false, true)).toMatchObject({
      canDownload: false,
    });
  });
});
