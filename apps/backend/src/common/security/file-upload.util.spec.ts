import { BadRequestException } from '@nestjs/common';
import {
  assertMagicBytes,
  createSecureMulterOptions,
} from './file-upload.util';
import { SAFE_IMAGE_MIME_TYPES } from './security.constants';

describe('file upload util', () => {
  it('rejects disallowed MIME types', () => {
    const options = createSecureMulterOptions({
      maxBytes: 1024,
      allowedMimeTypes: SAFE_IMAGE_MIME_TYPES,
    });

    const cb = jest.fn();
    options.fileFilter?.(
      {} as never,
      { mimetype: 'image/svg+xml', originalname: 'x.svg' } as never,
      cb,
    );

    expect(cb.mock.calls[0][0]).toBeInstanceOf(BadRequestException);
    expect(cb.mock.calls[0][1]).toBe(false);
  });

  it('accepts allowlisted MIME types', () => {
    const options = createSecureMulterOptions({
      maxBytes: 1024,
      allowedMimeTypes: SAFE_IMAGE_MIME_TYPES,
      allowedExtensions: ['png'],
    });

    const cb = jest.fn();
    options.fileFilter?.(
      {} as never,
      { mimetype: 'image/png', originalname: 'logo.png' } as never,
      cb,
    );

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('validates PNG magic bytes', () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    expect(() => assertMagicBytes(png, 'image/png')).not.toThrow();
    expect(() => assertMagicBytes(Buffer.from('not-png'), 'image/png')).toThrow(
      BadRequestException,
    );
  });
});
