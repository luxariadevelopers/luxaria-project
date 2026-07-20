import { BadRequestException } from '@nestjs/common';
import { QualityInspectionResult } from './schemas/quality-inspection.schema';

export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function assertLineDecision(input: {
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
}): void {
  if (!Number.isFinite(input.acceptedQuantity) || input.acceptedQuantity < 0) {
    throw new BadRequestException('acceptedQuantity must be ≥ 0');
  }
  if (!Number.isFinite(input.rejectedQuantity) || input.rejectedQuantity < 0) {
    throw new BadRequestException('rejectedQuantity must be ≥ 0');
  }
  const sum = input.acceptedQuantity + input.rejectedQuantity;
  if (Math.abs(sum - input.receivedQuantity) > 1e-6) {
    throw new BadRequestException(
      `acceptedQuantity + rejectedQuantity (${sum}) must equal receivedQuantity (${input.receivedQuantity})`,
    );
  }
  if (input.rejectedQuantity > 0) {
    const reason = input.rejectionReason?.trim() || '';
    if (reason.length < 3) {
      throw new BadRequestException(
        'rejectionReason is required when rejectedQuantity > 0',
      );
    }
  }
}

export function assertResultMatchesLines(input: {
  result: QualityInspectionResult;
  items: Array<{ acceptedQuantity: number; rejectedQuantity: number }>;
}): void {
  if (input.result === QualityInspectionResult.Hold) {
    return;
  }
  if (!input.items.length) {
    throw new BadRequestException(
      'Inspection line decisions are required for this result',
    );
  }

  const anyAccepted = input.items.some((i) => i.acceptedQuantity > 0);
  const anyRejected = input.items.some((i) => i.rejectedQuantity > 0);

  if (input.result === QualityInspectionResult.Accepted) {
    if (anyRejected) {
      throw new BadRequestException(
        'Accepted result cannot include rejected quantities; use partially_accepted',
      );
    }
    if (!anyAccepted) {
      throw new BadRequestException(
        'Accepted result requires acceptedQuantity > 0',
      );
    }
  }

  if (input.result === QualityInspectionResult.PartiallyAccepted) {
    if (!anyAccepted || !anyRejected) {
      throw new BadRequestException(
        'Partially accepted requires both accepted and rejected quantities',
      );
    }
  }

  if (input.result === QualityInspectionResult.Rejected) {
    if (anyAccepted) {
      throw new BadRequestException(
        'Rejected result cannot include accepted quantities; use partially_accepted',
      );
    }
    if (!anyRejected) {
      throw new BadRequestException(
        'Rejected result requires rejectedQuantity > 0',
      );
    }
  }
}

/**
 * Weighted vendor quality score 0–100.
 * Accepted=100, Partial=60, Hold=40, Rejected=0.
 */
export function computeVendorQualityScore(counts: {
  acceptedCount: number;
  partiallyAcceptedCount: number;
  rejectedCount: number;
  holdCount: number;
}): { score: number; ratingEquivalent: number; inspectionsCount: number } {
  const inspectionsCount =
    counts.acceptedCount +
    counts.partiallyAcceptedCount +
    counts.rejectedCount +
    counts.holdCount;

  if (inspectionsCount === 0) {
    return { score: 0, ratingEquivalent: 0, inspectionsCount: 0 };
  }

  const points =
    counts.acceptedCount * 100 +
    counts.partiallyAcceptedCount * 60 +
    counts.holdCount * 40 +
    counts.rejectedCount * 0;

  const score = Math.round((points / inspectionsCount) * 100) / 100;
  const ratingEquivalent = Math.round((score / 20) * 100) / 100; // 0–5

  return { score, ratingEquivalent, inspectionsCount };
}
