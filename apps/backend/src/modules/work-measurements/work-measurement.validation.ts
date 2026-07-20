import { BadRequestException } from '@nestjs/common';

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function normalizeMeasurementDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid measurementDate');
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

/** Merge array IDs with offline sync attachments (photo_0 …). */
export function mergePhotoDocumentIds(input: {
  ids?: string[];
  attachments?: Record<string, string>;
}): string[] {
  const fromIds = (input.ids ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
  const fromAttachments: string[] = [];
  for (const [key, value] of Object.entries(input.attachments ?? {})) {
    if (
      key === 'photoDocumentIds' ||
      key === 'photos' ||
      key.startsWith('photo')
    ) {
      fromAttachments.push(String(value).trim());
    }
  }
  return [...new Set([...fromIds, ...fromAttachments].filter(Boolean))];
}

/**
 * Cumulative cannot exceed BOQ planned quantity unless an approved
 * (active) variation/change-order raised the BOQ quantity.
 */
export function assertCumulativeWithinBoq(input: {
  cumulativeQuantity: number;
  boqPlannedQuantity: number;
  hasApprovedVariationCap: boolean;
}): void {
  const cumulative = roundQty(input.cumulativeQuantity);
  const cap = roundQty(input.boqPlannedQuantity);
  if (cumulative <= cap) {
    return;
  }
  if (!input.hasApprovedVariationCap) {
    throw new BadRequestException(
      `Cumulative quantity ${cumulative} exceeds BOQ quantity ${cap}. Approve a BOQ variation before measuring beyond BOQ.`,
    );
  }
  throw new BadRequestException(
    `Cumulative quantity ${cumulative} exceeds approved BOQ quantity ${cap}`,
  );
}
