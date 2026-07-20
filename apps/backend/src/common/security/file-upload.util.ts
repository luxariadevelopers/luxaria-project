import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export type FileUploadOptions = {
  maxBytes: number;
  allowedMimeTypes: readonly string[];
  /** Optional filename extensions (lowercase, without dot). */
  allowedExtensions?: readonly string[];
};

/**
 * Shared multer options: memory storage, size limit, MIME allowlist.
 * Never trust client file extension alone — MIME is checked; extension is optional extra.
 */
export function createSecureMulterOptions(
  options: FileUploadOptions,
): MulterOptions {
  const allowed = new Set(
    options.allowedMimeTypes.map((m) => m.toLowerCase()),
  );
  const allowedExt = options.allowedExtensions
    ? new Set(options.allowedExtensions.map((e) => e.toLowerCase()))
    : null;

  return {
    storage: memoryStorage(),
    limits: { fileSize: options.maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      const mime = (file.mimetype ?? '').toLowerCase();
      if (!allowed.has(mime)) {
        cb(
          new BadRequestException(
            `File type "${mime || 'unknown'}" is not allowed`,
          ),
          false,
        );
        return;
      }

      if (allowedExt) {
        const name = file.originalname ?? '';
        const ext = name.includes('.')
          ? name.split('.').pop()!.toLowerCase()
          : '';
        if (!ext || !allowedExt.has(ext)) {
          cb(
            new BadRequestException(
              `File extension ".${ext || '?'}" is not allowed`,
            ),
            false,
          );
          return;
        }
      }

      cb(null, true);
    },
  };
}

/** Magic-byte sniff for common image/PDF types (best-effort). */
export function assertMagicBytes(
  buffer: Buffer,
  mimeType: string,
): void {
  const mime = mimeType.toLowerCase();
  if (mime === 'image/png' && !buffer.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  )) {
    throw new BadRequestException('File content is not a valid PNG');
  }
  if (
    (mime === 'image/jpeg' || mime === 'image/jpg') &&
    !(buffer[0] === 0xff && buffer[1] === 0xd8)
  ) {
    throw new BadRequestException('File content is not a valid JPEG');
  }
  if (mime === 'application/pdf' && buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
    throw new BadRequestException('File content is not a valid PDF');
  }
}
