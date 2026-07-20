import {
  extensionForMime,
  isAllowedMimeType,
} from './documents.constants';

describe('documents.constants', () => {
  it('allows known MIME types and maps extensions from MIME only', () => {
    expect(isAllowedMimeType('application/pdf')).toBe(true);
    expect(isAllowedMimeType('application/x-msdownload')).toBe(false);
    expect(extensionForMime('application/pdf')).toBe('pdf');
    expect(extensionForMime('image/jpeg')).toBe('jpg');
  });
});
