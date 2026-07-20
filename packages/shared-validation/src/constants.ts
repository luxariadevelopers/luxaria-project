/**
 * Regex / limits copied from backend validation (do not invent alternate formats).
 *
 * Sources:
 * - `apps/backend/src/modules/company/company.validation.ts`
 * - `apps/backend/src/modules/vendors/vendors.validation.ts`
 * - `apps/backend/src/modules/documents/documents.constants.ts`
 * - `apps/backend/src/modules/documents/dto/presign-upload.dto.ts`
 * - `apps/backend/src/modules/journal/journal.validation.ts`
 * - `apps/backend/src/modules/daily-progress-reports/dpr.validation.ts`
 */

/** Indian PAN: 5 letters + 4 digits + 1 letter */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Indian TAN: 4 letters + 5 digits + 1 letter */
export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

/** GSTIN: 15 chars */
export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** CIN (approx): U/L + 5 digits + 2 state + 4 year + 3 type + 6 digits */
export const CIN_REGEX = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/** IFSC: 4 letters + 0 + 6 alphanumeric */
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Bank account number: 9–18 digits (spaces stripped). */
export const ACCOUNT_NUMBER_DIGITS_REGEX = /^\d{9,18}$/;

/**
 * Indian mobile digits used across API examples / fixtures (`9876543210`).
 * Backend user DTOs only require `@IsString()`; this is the product convention.
 */
export const INDIAN_MOBILE_DIGITS_REGEX = /^[6-9]\d{9}$/;

/** SHA-256 hex (presign confirm checksum). */
export const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;

/** Calendar date `YYYY-MM-DD` (DPR / report date keys). */
export const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Money equality epsilon from journal validation. */
export const MONEY_EPS = 0.005;

/** PresignUploadDto `@Max(100 * 1024 * 1024)`. */
export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;

/** Allowed document MIME types from `documents.constants.ts`. */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export type AllowedDocumentMimeType =
  (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];
