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

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONGO_OBJECT_ID = /^[a-fA-F0-9]{24}$/;

export function isMongoObjectId(value: string): boolean {
  return MONGO_OBJECT_ID.test(value.trim());
}

export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value.trim());
}

/** Mirrors Nest `@Min(0.000001)` on issue item quantity. */
export function assertPositiveIssueQuantity(input: {
  materialLabel: string;
  quantity: number;
}): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return {
      ok: false,
      message: `Issue quantity must be greater than 0 for ${input.materialLabel}`,
    };
  }
  if (input.quantity < 0.000001) {
    return {
      ok: false,
      message: `Issue quantity is too small for ${input.materialLabel}`,
    };
  }
  return { ok: true };
}

export type IssueLineDraft = {
  materialId: string;
  materialLabel: string;
  unit: string;
  quantityText: string;
  batch: string;
  notes: string;
};

export type ValidateIssueFormInput = {
  projectId: string;
  issueDate: string;
  receivedBy: string;
  boqItemId: string;
  workLocation: string;
  contractorId?: string;
  blockId?: string;
  floorId?: string;
  storeLocation?: string;
  notes?: string;
  lines: IssueLineDraft[];
};

export function validateIssueForm(
  input: ValidateIssueFormInput,
):
  | {
      ok: true;
      payload: {
        projectId: string;
        issueDate: string;
        receivedBy: string;
        boqItemId: string;
        workLocation: string;
        contractorId?: string | null;
        blockId?: string | null;
        floorId?: string | null;
        storeLocation?: string | null;
        notes?: string | null;
        items: Array<{
          materialId: string;
          quantity: number;
          unit: string;
          batch: string | null;
          notes: string | null;
        }>;
      };
    }
  | { ok: false; message: string } {
  if (!isMongoObjectId(input.projectId)) {
    return { ok: false, message: 'Select a valid project' };
  }
  if (!isDateOnly(input.issueDate)) {
    return { ok: false, message: 'Issue date must be YYYY-MM-DD' };
  }
  if (!isMongoObjectId(input.receivedBy)) {
    return { ok: false, message: 'Select who receives the material on site' };
  }
  if (!isMongoObjectId(input.boqItemId)) {
    return { ok: false, message: 'Select a BOQ item to charge this issue against' };
  }
  const workLocation = input.workLocation.trim();
  if (!workLocation) {
    return { ok: false, message: 'Work location is required' };
  }
  if (workLocation.length > 240) {
    return { ok: false, message: 'Work location is too long (max 240 characters)' };
  }
  if (input.contractorId?.trim() && !isMongoObjectId(input.contractorId)) {
    return { ok: false, message: 'Contractor id is invalid' };
  }
  if (input.blockId?.trim() && !isMongoObjectId(input.blockId)) {
    return { ok: false, message: 'Block id is invalid' };
  }

  const items: Array<{
    materialId: string;
    quantity: number;
    unit: string;
    batch: string | null;
    notes: string | null;
  }> = [];

  for (const line of input.lines) {
    const trimmedQty = line.quantityText.trim();
    if (!trimmedQty) continue;
    if (!isMongoObjectId(line.materialId)) {
      return {
        ok: false,
        message: `Material id is invalid for ${line.materialLabel || 'line'}`,
      };
    }
    const quantity = Number(trimmedQty);
    const check = assertPositiveIssueQuantity({
      materialLabel: line.materialLabel || line.materialId,
      quantity,
    });
    if (!check.ok) {
      return check;
    }
    const unit = line.unit.trim();
    if (!unit) {
      return {
        ok: false,
        message: `Unit is required for ${line.materialLabel || line.materialId}`,
      };
    }
    items.push({
      materialId: line.materialId.trim(),
      quantity,
      unit,
      batch: line.batch.trim() || null,
      notes: line.notes.trim() || null,
    });
  }

  if (!items.length) {
    return {
      ok: false,
      message: 'Add at least one material line with quantity',
    };
  }

  return {
    ok: true,
    payload: {
      projectId: input.projectId.trim(),
      issueDate: input.issueDate.trim(),
      receivedBy: input.receivedBy.trim(),
      boqItemId: input.boqItemId.trim(),
      workLocation,
      contractorId: input.contractorId?.trim() || null,
      blockId: input.blockId?.trim() || null,
      floorId: input.floorId?.trim() || null,
      storeLocation: input.storeLocation?.trim() || null,
      notes: input.notes?.trim() || null,
      items,
    },
  };
}
