/**
 * Web re-exports of shared Zod schemas (Micro Phase 004).
 * Prefer these so client forms match backend DTO rules.
 */
export {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  attachmentMetaSchema,
  bankAccountNumberRequiredSchema,
  bankAccountNumberSchema,
  documentMimeTypeSchema,
  emailRequiredSchema,
  emailSchema,
  gstinRequiredSchema,
  gstinSchema,
  ifscRequiredSchema,
  ifscSchema,
  isAllowedDocumentMimeType,
  isoDateOnlySchema,
  isoDateStringSchema,
  isoDateTimeSchema,
  mobileRequiredSchema,
  mobileSchema,
  moneyAmountSchema,
  moneyNonNegativeSchema,
  panRequiredSchema,
  panSchema,
  percentageSchema,
  quantitySchema,
  roundMoney,
  roundQty,
  sha256ChecksumSchema,
} from '@luxaria/shared-validation';

