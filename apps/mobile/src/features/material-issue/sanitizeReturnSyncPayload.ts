import type { CreateMaterialReturnInput, MaterialUnit } from './types';

const RETURN_ENDPOINT_RE = /^\/material-issues\/[^/]+\/returns\/?$/;

export function isMaterialReturnEndpoint(endpoint: string): boolean {
  return RETURN_ENDPOINT_RE.test(endpoint);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/**
 * Nest `CreateMaterialReturnDto` uses `forbidNonWhitelisted`.
 * Offline sync merges `attachments`, `clientTransactionId`, `photo_*`, etc.
 * Strip those and fold uploaded photo document IDs into `notes`.
 */
export function toCreateMaterialReturnBody(
  payload: Record<string, unknown>,
): CreateMaterialReturnInput {
  const attachments = asRecord(payload.attachments) ?? {};
  const photoIds = Object.entries(attachments)
    .filter(([key, value]) => key.startsWith('photo_') && typeof value === 'string')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value as string);

  // Also pick top-level photo_* keys written by buildSyncPayload
  for (const [key, value] of Object.entries(payload)) {
    if (
      key.startsWith('photo_') &&
      typeof value === 'string' &&
      !photoIds.includes(value)
    ) {
      photoIds.push(value);
    }
  }

  const noteParts: string[] = [];
  if (typeof payload.notes === 'string' && payload.notes.trim()) {
    noteParts.push(payload.notes.trim());
  }
  if (photoIds.length) {
    noteParts.push(`photoDocumentIds: ${photoIds.join(',')}`);
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems.map((raw) => {
    const item = asRecord(raw) ?? {};
    return {
      materialId: String(item.materialId ?? ''),
      quantity: Number(item.quantity),
      unit: item.unit as MaterialUnit,
      reason:
        typeof item.reason === 'string'
          ? item.reason
          : item.reason == null
            ? null
            : String(item.reason),
    };
  });

  const body: CreateMaterialReturnInput = {
    returnDate: String(payload.returnDate ?? ''),
    notes: noteParts.length ? noteParts.join('\n') : null,
    items,
  };

  if (typeof payload.returnedBy === 'string' && payload.returnedBy.trim()) {
    body.returnedBy = payload.returnedBy.trim();
  }

  return body;
}
