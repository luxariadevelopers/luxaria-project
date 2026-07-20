/**
 * Maps sync-engine media field keys `itemPhoto_<index>` into
 * Nest `items[i].photo` document ids before create.
 */
export function mergeStockCountItemPhotos(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const attachments =
    payload.attachments && typeof payload.attachments === 'object'
      ? (payload.attachments as Record<string, unknown>)
      : {};

  const itemsRaw = Array.isArray(payload.items) ? payload.items : [];
  const items = itemsRaw.map((raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    return { ...(raw as Record<string, unknown>) };
  });

  const apply = (key: string, documentId: string) => {
    const match = /^itemPhoto_(\d+)$/.exec(key);
    if (!match) return;
    const index = Number(match[1]);
    const item = items[index];
    if (!item || typeof item !== 'object') return;
    (item as Record<string, unknown>).photo = documentId;
  };

  for (const [key, value] of Object.entries(attachments)) {
    if (typeof value === 'string' && value.trim()) {
      apply(key, value.trim());
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string' && value.trim()) {
      apply(key, value.trim());
    }
  }

  const {
    attachments: _a,
    clientTransactionId: _c,
    idempotencyKey: _i,
    deviceTimestamp: _d,
    submitAfterCreate: _s,
    ...rest
  } = payload;

  const cleaned: Record<string, unknown> = { ...rest, items };
  for (const key of Object.keys(cleaned)) {
    if (/^itemPhoto_\d+$/.test(key) || /^photo_\d+$/.test(key)) {
      delete cleaned[key];
    }
  }
  return cleaned;
}

export function wantsStockCountSubmitAfterCreate(
  txnType: string,
  payload: Record<string, unknown>,
): boolean {
  return (
    txnType === 'stock_count.create_submit' ||
    payload.submitAfterCreate === true
  );
}
