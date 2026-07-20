import { describe, expect, it } from 'vitest';
import {
  buildDprMediaEntries,
  describeMediaReference,
  isDocumentObjectId,
  isUploadPath,
} from './mediaHelpers';

describe('buildDprMediaEntries', () => {
  it('merges photos and videos with stable labels', () => {
    const entries = buildDprMediaEntries({
      photoDocumentIds: ['abc123', '  '],
      videoDocumentIds: ['vid1'],
    });
    expect(entries).toEqual([
      {
        key: 'photo-0-abc123',
        ref: 'abc123',
        label: 'Photo 1',
        kind: 'photo',
      },
      {
        key: 'video-0-vid1',
        ref: 'vid1',
        label: 'Video 1',
        kind: 'video',
      },
    ]);
  });

  it('returns empty when no media refs', () => {
    expect(buildDprMediaEntries({})).toEqual([]);
  });
});

describe('describeMediaReference', () => {
  it('allows uploads paths without document.download', () => {
    expect(isUploadPath('uploads/dpr/photo.jpg')).toBe(true);
    expect(describeMediaReference('uploads/dpr/photo.jpg', false)).toEqual({
      canResolve: true,
    });
  });

  it('requires document.download for Mongo object ids', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(isDocumentObjectId(id)).toBe(true);
    expect(describeMediaReference(id, false)).toEqual({
      canResolve: false,
      reason: 'Missing permission document.download',
    });
    expect(describeMediaReference(id, true)).toEqual({ canResolve: true });
  });

  it('rejects unknown reference shapes', () => {
    expect(describeMediaReference('not-an-id', true)).toEqual({
      canResolve: false,
      reason: 'Unrecognized media reference',
    });
  });
});
