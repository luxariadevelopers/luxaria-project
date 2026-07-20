import type { QualityAcceptItemInput } from './types';

const QTY_EPS = 1e-6;

export type AcceptLineDraft = {
  lineId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
};

export type AcceptLineValidation = {
  ok: boolean;
  messages: string[];
  /** accepted + rejected exceeds received (phase ≤ rule). */
  exceedsReceived: boolean;
  /** Sum is less than received — Nest requires equality before accept. */
  underAllocated: boolean;
};

/**
 * Client preview of Nest `assertQualityDecision` plus the Phase 068
 * over-allocation rule (`accepted + rejected ≤ received`).
 *
 * Nest still requires `accepted + rejected === received` on
 * `POST /goods-receipts/:id/accept` — use {@link validateAcceptPayload}.
 */
export function validateAcceptLine(line: AcceptLineDraft): AcceptLineValidation {
  const messages: string[] = [];
  const accepted = Number(line.acceptedQuantity);
  const rejected = Number(line.rejectedQuantity);
  const received = Number(line.receivedQuantity);

  if (!Number.isFinite(accepted) || accepted < 0) {
    messages.push('Accepted quantity must be ≥ 0');
  }
  if (!Number.isFinite(rejected) || rejected < 0) {
    messages.push('Rejected quantity must be ≥ 0');
  }
  if (!Number.isFinite(received) || received < 0) {
    messages.push('Received quantity is invalid');
  }

  const sum =
    (Number.isFinite(accepted) ? accepted : 0) +
    (Number.isFinite(rejected) ? rejected : 0);
  const exceedsReceived = sum - received > QTY_EPS;
  const underAllocated = received - sum > QTY_EPS;

  if (exceedsReceived) {
    messages.push(
      `Accepted + rejected (${sum}) must not exceed received (${received})`,
    );
  }

  if (rejected > QTY_EPS) {
    const reason = line.rejectionReason?.trim() || '';
    if (reason.length < 3) {
      messages.push(
        'Rejection reason is required (min 3 characters) when rejected > 0',
      );
    }
  }

  return {
    ok: messages.length === 0 && !underAllocated,
    messages,
    exceedsReceived,
    underAllocated,
  };
}

export type AcceptPayloadValidation =
  | { ok: true; items: QualityAcceptItemInput[] }
  | { ok: false; message: string; lineErrors: Record<string, string[]> };

/**
 * Build Nest accept payload. Requires full allocation
 * (`accepted + rejected === received`) and at least one accepted > 0
 * (Nest `accept` rejects full reject via `allowFullReject: false`).
 */
export function validateAcceptPayload(
  lines: readonly AcceptLineDraft[],
): AcceptPayloadValidation {
  if (lines.length < 1) {
    return {
      ok: false,
      message: 'At least one line is required',
      lineErrors: {},
    };
  }

  const lineErrors: Record<string, string[]> = {};
  let anyAccepted = false;

  for (const line of lines) {
    const result = validateAcceptLine(line);
    const messages = [...result.messages];
    if (result.underAllocated && !result.exceedsReceived) {
      messages.push(
        `Accepted + rejected must equal received (${line.receivedQuantity})`,
      );
    }
    if (messages.length > 0) {
      lineErrors[line.lineId] = messages;
    }
    if (Number(line.acceptedQuantity) > QTY_EPS) {
      anyAccepted = true;
    }
  }

  if (Object.keys(lineErrors).length > 0) {
    return {
      ok: false,
      message: 'Fix acceptance quantities before submitting',
      lineErrors,
    };
  }

  if (!anyAccepted) {
    return {
      ok: false,
      message: 'At least one line must have accepted quantity > 0',
      lineErrors: {},
    };
  }

  return {
    ok: true,
    items: lines.map((line) => ({
      lineId: line.lineId,
      acceptedQuantity: Number(line.acceptedQuantity),
      rejectedQuantity: Number(line.rejectedQuantity),
      rejectionReason:
        Number(line.rejectedQuantity) > QTY_EPS
          ? line.rejectionReason?.trim() || null
          : null,
    })),
  };
}

/** Default drafts: full accept (partial acceptance edited in UI). */
export function defaultAcceptDrafts(
  items: readonly {
    id: string;
    receivedQuantity: number;
    acceptedQuantity?: number | null;
    rejectedQuantity?: number | null;
    rejectionReason?: string | null;
  }[],
): AcceptLineDraft[] {
  return items.map((item) => {
    const hasDecision =
      item.acceptedQuantity != null || item.rejectedQuantity != null;
    return {
      lineId: item.id,
      receivedQuantity: item.receivedQuantity,
      acceptedQuantity: hasDecision
        ? Number(item.acceptedQuantity ?? 0)
        : item.receivedQuantity,
      rejectedQuantity: hasDecision
        ? Number(item.rejectedQuantity ?? 0)
        : 0,
      rejectionReason: item.rejectionReason ?? '',
    };
  });
}
