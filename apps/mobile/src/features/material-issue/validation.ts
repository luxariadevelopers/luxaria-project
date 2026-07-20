/**
 * Client-side return quantity guard (mirrors Nest `assertReturnWithinIssued`
 * + positive quantity DTO `@Min(0.000001)`).
 */
export function assertPositiveReturnQuantity(input: {
  materialLabel: string;
  returnQuantity: number;
  remainingBaseQuantity: number;
}): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(input.returnQuantity) || input.returnQuantity <= 0) {
    return { ok: false, message: 'Return quantity must be greater than 0' };
  }
  if (input.returnQuantity - input.remainingBaseQuantity > 1e-9) {
    return {
      ok: false,
      message: `Return quantity exceeds remaining issued stock for ${input.materialLabel} (remaining ${input.remainingBaseQuantity})`,
    };
  }
  return { ok: true };
}

export type ReturnLineDraft = {
  materialId: string;
  materialLabel: string;
  unit: string;
  remainingBaseQuantity: number;
  quantityText: string;
  reason: string;
};

/**
 * Validates all return lines before enqueue / online post.
 * Lines with empty quantity text are skipped (not returned).
 */
export function validateReturnLines(
  lines: ReturnLineDraft[],
):
  | { ok: true; items: Array<{ materialId: string; quantity: number; unit: string; reason: string | null }> }
  | { ok: false; message: string } {
  const items: Array<{
    materialId: string;
    quantity: number;
    unit: string;
    reason: string | null;
  }> = [];

  for (const line of lines) {
    const trimmed = line.quantityText.trim();
    if (!trimmed) continue;
    const quantity = Number(trimmed);
    const check = assertPositiveReturnQuantity({
      materialLabel: line.materialLabel,
      returnQuantity: quantity,
      remainingBaseQuantity: line.remainingBaseQuantity,
    });
    if (!check.ok) {
      return check;
    }
    items.push({
      materialId: line.materialId,
      quantity,
      unit: line.unit,
      reason: line.reason.trim() || null,
    });
  }

  if (!items.length) {
    return {
      ok: false,
      message: 'Enter a return quantity for at least one material',
    };
  }

  return { ok: true, items };
}
