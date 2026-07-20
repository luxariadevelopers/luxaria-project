import { z } from 'zod';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  SHA256_HEX_REGEX,
  type AllowedDocumentMimeType,
} from './constants';

export function isAllowedDocumentMimeType(
  mimeType: string,
): mimeType is AllowedDocumentMimeType {
  return (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(
    mimeType.toLowerCase(),
  );
}

export const documentMimeTypeSchema = z
  .string()
  .min(1, 'MIME type is required')
  .refine((value) => isAllowedDocumentMimeType(value), {
    message: `Unsupported document type. Allowed: ${ALLOWED_DOCUMENT_MIME_TYPES.join(', ')}`,
  });

/** Declared upload size — PresignUploadDto `@Min(1)` `@Max(100MB)`. */
export const attachmentSizeSchema = z
  .number()
  .int('Size must be an integer')
  .min(1, 'Size must be at least 1 byte')
  .max(MAX_ATTACHMENT_BYTES, `Size must be ≤ ${MAX_ATTACHMENT_BYTES} bytes`);

export const sha256ChecksumSchema = z
  .string()
  .regex(SHA256_HEX_REGEX, 'checksum must be a 64-character hex SHA-256');

export const sha256ChecksumOptionalSchema = sha256ChecksumSchema
  .optional()
  .nullable();

/**
 * Client-side attachment metadata before / after S3 confirm
 * (aligned with presign + confirm DTOs).
 */
export const attachmentMetaSchema = z.object({
  originalFileName: z.string().min(1, 'File name is required'),
  mimeType: documentMimeTypeSchema,
  size: attachmentSizeSchema,
  checksum: sha256ChecksumOptionalSchema,
  documentType: z
    .string()
    .regex(
      /^[a-z0-9_]+$/,
      'documentType must be lowercase alphanumeric with underscores',
    ),
});

export type AttachmentMeta = z.infer<typeof attachmentMetaSchema>;
