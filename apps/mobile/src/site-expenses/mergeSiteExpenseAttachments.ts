import { SiteExpenseAttachmentType } from './types';

const SIGNATURE_FIELD_KEY = 'signature';

/**
 * Maps sync-engine media keys (`signature` / attachments map) into Nest
 * `attachments: [{ type, documentId, … }]` and strips offline-only fields.
 */
export function mergeSiteExpenseAttachments(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const attachmentsMap =
    payload.attachments && typeof payload.attachments === 'object' && !Array.isArray(payload.attachments)
      ? (payload.attachments as Record<string, unknown>)
      : {};

  const existingArray = Array.isArray(payload.attachments)
    ? (payload.attachments as Array<Record<string, unknown>>)
    : [];

  const byType = new Map<string, Record<string, unknown>>();
  for (const row of existingArray) {
    if (row && typeof row === 'object' && typeof row.type === 'string') {
      byType.set(row.type, { ...row });
    }
  }

  const apply = (fieldKey: string, documentId: string) => {
    const type =
      fieldKey === SIGNATURE_FIELD_KEY || fieldKey.startsWith('signature')
        ? SiteExpenseAttachmentType.Signature
        : fieldKey === 'bill' || fieldKey.startsWith('bill')
          ? SiteExpenseAttachmentType.Bill
          : fieldKey === 'photo' || fieldKey.startsWith('photo')
            ? SiteExpenseAttachmentType.Photo
            : SiteExpenseAttachmentType.Other;
    byType.set(type, {
      type,
      documentId,
      fileName: null,
      filePath: null,
      mimeType: null,
    });
  };

  for (const [key, value] of Object.entries(attachmentsMap)) {
    if (typeof value === 'string' && value.trim()) {
      apply(key, value.trim());
    }
  }

  if (typeof payload[SIGNATURE_FIELD_KEY] === 'string') {
    const id = String(payload[SIGNATURE_FIELD_KEY]).trim();
    if (id) apply(SIGNATURE_FIELD_KEY, id);
  }

  const {
    attachments: _a,
    clientTransactionId: _c,
    idempotencyKey: _i,
    deviceTimestamp: _d,
    submitAfterCreate: _s,
    offlineCapturedAt: _o,
    signature: _sig,
    ...rest
  } = payload;

  const cleaned: Record<string, unknown> = { ...rest };
  delete cleaned[SIGNATURE_FIELD_KEY];

  const attachments = [...byType.values()];
  if (attachments.length > 0) {
    cleaned.attachments = attachments;
  }

  return cleaned;
}
