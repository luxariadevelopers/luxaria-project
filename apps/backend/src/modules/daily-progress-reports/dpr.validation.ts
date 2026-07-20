import { BadRequestException } from '@nestjs/common';

export function roundQty(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Normalize to UTC midnight for unique project+date key. */
export function normalizeReportDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid reportDate');
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function reportDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

/** Merge array IDs with offline sync attachments (photo_0 / video_0 …). */
export function mergeDocumentIds(input: {
  ids?: string[];
  attachments?: Record<string, string>;
  prefix: 'photo' | 'video';
}): string[] {
  const fromIds = (input.ids ?? []).map((id) => String(id).trim()).filter(Boolean);
  const fromAttachments: string[] = [];
  for (const [key, value] of Object.entries(input.attachments ?? {})) {
    if (
      key === `${input.prefix}DocumentIds` ||
      key.startsWith(input.prefix)
    ) {
      fromAttachments.push(String(value).trim());
    }
  }
  return [...new Set([...fromIds, ...fromAttachments].filter(Boolean))];
}
