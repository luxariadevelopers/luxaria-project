/**
 * Shared Zod validation schemas for Luxaria Developers ERP (Micro Phase 004).
 * Constraints mirror Nest DTO / validation helpers — do not invent alternate rules.
 */

export { healthStatusSchema, type HealthStatusInput } from './health';

export {
  ACCOUNT_NUMBER_DIGITS_REGEX,
  ALLOWED_DOCUMENT_MIME_TYPES,
  CIN_REGEX,
  GSTIN_REGEX,
  IFSC_REGEX,
  INDIAN_MOBILE_DIGITS_REGEX,
  ISO_DATE_ONLY_REGEX,
  MAX_ATTACHMENT_BYTES,
  MONEY_EPS,
  PAN_REGEX,
  SHA256_HEX_REGEX,
  TAN_REGEX,
  type AllowedDocumentMimeType,
} from './constants';

export {
  moneyAmountSchema,
  moneyEquals,
  moneyNonNegativeOptionalSchema,
  moneyNonNegativeSchema,
  moneyOptionalSchema,
  percentageSchema,
  roundMoney,
  type MoneyAmount,
} from './money';

export {
  quantityOptionalSchema,
  quantityPositiveSchema,
  quantitySchema,
  roundQty,
  type Quantity,
} from './quantity';

export {
  isoDateOnlySchema,
  isoDateStringOptionalSchema,
  isoDateStringSchema,
  isoDateTimeSchema,
  normalizeUtcDateOnly,
  reportDateKey,
} from './dates';

export {
  cinSchema,
  gstinRequiredSchema,
  gstinSchema,
  normalizeOptionalCode,
  panRequiredSchema,
  panSchema,
  tanSchema,
} from './identity';

export {
  emailRequiredSchema,
  emailSchema,
  mobileRequiredSchema,
  mobileSchema,
} from './contact';

export {
  bankAccountNumberRequiredSchema,
  bankAccountNumberSchema,
  ifscRequiredSchema,
  ifscSchema,
  normalizeAccountNumber,
  normalizeIfsc,
} from './banking';

export {
  attachmentMetaSchema,
  attachmentSizeSchema,
  documentMimeTypeSchema,
  isAllowedDocumentMimeType,
  sha256ChecksumOptionalSchema,
  sha256ChecksumSchema,
  type AttachmentMeta,
} from './attachments';
