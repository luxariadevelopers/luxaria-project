import { BadRequestException, ConflictException } from '@nestjs/common';
import { LabourAttendanceEntryMode } from './schemas/labour-attendance.schema';

export function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Normalize to UTC midnight for unique project+contractor+date key. */
export function normalizeAttendanceDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid attendanceDate');
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function attendanceDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

export function assertGps(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new BadRequestException('latitude must be between -90 and 90');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new BadRequestException('longitude must be between -180 and 180');
  }
}

/** Merge array IDs with offline sync attachments (group_photo_0 …). */
export function mergeDocumentIds(input: {
  ids?: string[];
  attachments?: Record<string, string>;
  prefix: string;
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

export type AttendanceWorkerInput = {
  workerCode?: string | null;
  workerName: string;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  overtimeHours?: number;
  remarks?: string | null;
};

export type AttendanceLineInput = {
  labourCategoryId: string;
  entryMode: LabourAttendanceEntryMode;
  workerCount?: number;
  overtimeHours?: number;
  workers?: AttendanceWorkerInput[];
  remarks?: string | null;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseOptionalDate(
  value: string | Date | null | undefined,
  field: string,
): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return date;
}

export function assertWorkerTimes(input: {
  checkIn: Date | null;
  checkOut: Date | null;
  label: string;
}): void {
  if (input.checkIn && input.checkOut && input.checkOut < input.checkIn) {
    throw new BadRequestException(
      `${input.label}: checkOut must be on or after checkIn`,
    );
  }
}

/**
 * Normalize lines, enforce group/individual rules, and detect duplicates
 * (same labour category twice; same worker code/name within the sheet).
 */
export function normalizeAttendanceLines(lines: AttendanceLineInput[]): Array<{
  labourCategoryId: string;
  entryMode: LabourAttendanceEntryMode;
  workerCount: number;
  overtimeHours: number;
  workers: Array<{
    workerCode: string | null;
    workerName: string;
    checkIn: Date | null;
    checkOut: Date | null;
    overtimeHours: number;
    remarks: string | null;
  }>;
  remarks: string | null;
}> {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new BadRequestException('At least one attendance line is required');
  }

  const categoryIds = new Set<string>();
  const workerCodes = new Set<string>();
  const workerNames = new Set<string>();

  return lines.map((line, index) => {
    const label = `lines[${index}]`;
    const categoryId = String(line.labourCategoryId ?? '').trim();
    if (!categoryId) {
      throw new BadRequestException(`${label}.labourCategoryId is required`);
    }
    if (categoryIds.has(categoryId)) {
      throw new ConflictException(
        `Duplicate labour category on attendance sheet (${categoryId})`,
      );
    }
    categoryIds.add(categoryId);

    if (
      line.entryMode !== LabourAttendanceEntryMode.Group &&
      line.entryMode !== LabourAttendanceEntryMode.Individual
    ) {
      throw new BadRequestException(
        `${label}.entryMode must be group or individual`,
      );
    }

    const workers = (line.workers ?? []).map((worker, wIndex) => {
      const wLabel = `${label}.workers[${wIndex}]`;
      const workerName = String(worker.workerName ?? '').trim();
      if (!workerName) {
        throw new BadRequestException(`${wLabel}.workerName is required`);
      }

      const workerCode = worker.workerCode?.trim().toUpperCase() || null;
      if (workerCode) {
        if (workerCodes.has(workerCode)) {
          throw new ConflictException(
            `Duplicate worker code on attendance sheet: ${workerCode}`,
          );
        }
        workerCodes.add(workerCode);
      }

      const nameKey = normalizeName(workerName);
      if (workerNames.has(nameKey)) {
        throw new ConflictException(
          `Duplicate worker name on attendance sheet: ${workerName}`,
        );
      }
      workerNames.add(nameKey);

      const overtimeHours = roundHours(worker.overtimeHours ?? 0);
      assertNonNegative(overtimeHours, `${wLabel}.overtimeHours`);

      const checkIn = parseOptionalDate(worker.checkIn, `${wLabel}.checkIn`);
      const checkOut = parseOptionalDate(worker.checkOut, `${wLabel}.checkOut`);
      assertWorkerTimes({ checkIn, checkOut, label: wLabel });

      return {
        workerCode,
        workerName,
        checkIn,
        checkOut,
        overtimeHours,
        remarks: worker.remarks?.trim() || null,
      };
    });

    let workerCount: number;
    let overtimeHours: number;

    if (line.entryMode === LabourAttendanceEntryMode.Individual) {
      if (workers.length < 1) {
        throw new BadRequestException(
          `${label}: individual attendance requires at least one worker`,
        );
      }
      workerCount = workers.length;
      overtimeHours =
        line.overtimeHours != null
          ? roundHours(line.overtimeHours)
          : roundHours(
              workers.reduce((sum, worker) => sum + worker.overtimeHours, 0),
            );
    } else {
      workerCount = Math.trunc(line.workerCount ?? 0);
      if (!Number.isFinite(workerCount) || workerCount < 1) {
        throw new BadRequestException(
          `${label}.workerCount must be ≥ 1 for group attendance`,
        );
      }
      if (workers.length > workerCount) {
        throw new BadRequestException(
          `${label}: workers length cannot exceed workerCount`,
        );
      }
      overtimeHours = roundHours(
        line.overtimeHours ??
          workers.reduce((sum, worker) => sum + worker.overtimeHours, 0),
      );
    }

    assertNonNegative(overtimeHours, `${label}.overtimeHours`);

    return {
      labourCategoryId: categoryId,
      entryMode: line.entryMode,
      workerCount,
      overtimeHours,
      workers,
      remarks: line.remarks?.trim() || null,
    };
  });
}

export function assertReadyForSubmit(input: {
  lines: unknown[];
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  groupPhotoDocumentIds: string[];
}): void {
  if (!input.lines?.length) {
    throw new BadRequestException('At least one attendance line is required');
  }
  if (input.latitude == null || input.longitude == null) {
    throw new BadRequestException('GPS latitude and longitude are required');
  }
  assertGps(input.latitude, input.longitude);
  if (!input.groupPhotoDocumentIds?.length) {
    throw new BadRequestException(
      'At least one group photo is required before submit',
    );
  }
}
