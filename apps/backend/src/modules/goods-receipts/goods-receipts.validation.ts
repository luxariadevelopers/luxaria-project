import { BadRequestException } from '@nestjs/common';

export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function assertGps(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new BadRequestException('latitude must be between -90 and 90');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new BadRequestException('longitude must be between -180 and 180');
  }
}

export function assertPhotos(photos: string[]): void {
  const cleaned = (photos ?? []).map((p) => p.trim()).filter(Boolean);
  if (cleaned.length < 1) {
    throw new BadRequestException('At least one receipt photo is required');
  }
}

export function assertReceivedQuantities(input: {
  orderedQuantity: number;
  receivedQuantity: number;
  tolerancePercent: number;
}): void {
  if (!Number.isFinite(input.receivedQuantity) || input.receivedQuantity <= 0) {
    throw new BadRequestException('receivedQuantity must be > 0');
  }
  if (!Number.isFinite(input.orderedQuantity) || input.orderedQuantity < 0) {
    throw new BadRequestException('orderedQuantity must be ≥ 0');
  }
  const max =
    input.orderedQuantity * (1 + Math.max(0, input.tolerancePercent) / 100);
  if (input.receivedQuantity - max > 1e-9) {
    throw new BadRequestException(
      `receivedQuantity (${input.receivedQuantity}) exceeds ordered (${input.orderedQuantity}) beyond ${input.tolerancePercent}% tolerance`,
    );
  }
}

/**
 * accepted + rejected must equal received; rejection reason required when rejected > 0.
 */
export function assertQualityDecision(input: {
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

export function mergePhotoIds(input: {
  photos?: string[] | string;
  attachments?: Record<string, string>;
  photoFields?: Record<string, unknown>;
}): string[] {
  const fromPhotos = Array.isArray(input.photos)
    ? input.photos.map((p) => String(p).trim())
    : typeof input.photos === 'string' && input.photos.trim()
      ? [input.photos.trim()]
      : [];
  const fromAttachments: string[] = [];
  for (const [key, value] of Object.entries(input.attachments ?? {})) {
    if (
      key === 'photos' ||
      key.startsWith('photo') ||
      key.startsWith('photos_')
    ) {
      fromAttachments.push(String(value).trim());
    }
  }
  for (const [key, value] of Object.entries(input.photoFields ?? {})) {
    if (
      (key === 'photos' ||
        key.startsWith('photo') ||
        key.startsWith('photos_')) &&
      typeof value === 'string'
    ) {
      fromAttachments.push(value.trim());
    }
  }
  return [...new Set([...fromPhotos, ...fromAttachments].filter(Boolean))];
}
