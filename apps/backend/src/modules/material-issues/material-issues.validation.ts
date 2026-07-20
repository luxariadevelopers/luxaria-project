import { BadRequestException } from '@nestjs/common';
import type { MaterialIssueSignatures } from './schemas/material-issue.schema';

export function roundQty(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

export function normalizeLocation(location?: string | null): string {
  return (location ?? '').trim();
}

export function assertPositiveQuantity(value: number, field = 'quantity'): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestException(`${field} must be greater than 0`);
  }
}

export function assertWorkLocation(workLocation?: string | null): string {
  const value = workLocation?.trim() ?? '';
  if (!value) {
    throw new BadRequestException(
      'workLocation is required to link the issue to a work location',
    );
  }
  return value;
}

export function assertBoqItemId(boqItemId?: string | null): string {
  if (!boqItemId?.trim()) {
    throw new BadRequestException(
      'boqItemId is required to link the issue to a BOQ item',
    );
  }
  return boqItemId.trim();
}

export function assertRecipientSignaturePresent(
  signatures?: MaterialIssueSignatures | null,
): void {
  if (
    !signatures?.recipientSignatureDocumentId ||
    !signatures?.recipientSignatureChecksum?.trim()
  ) {
    throw new BadRequestException(
      'Recipient signature is required before submission/confirmation',
    );
  }
}

export function assertReturnWithinIssued(input: {
  materialCode: string | null;
  issuedBase: number;
  alreadyReturnedBase: number;
  returnBase: number;
}): void {
  const remaining = roundQty(input.issuedBase - input.alreadyReturnedBase);
  if (input.returnBase - remaining > 1e-9) {
    throw new BadRequestException(
      `Return quantity exceeds remaining issued stock for ${input.materialCode ?? 'material'} (remaining ${remaining})`,
    );
  }
}
