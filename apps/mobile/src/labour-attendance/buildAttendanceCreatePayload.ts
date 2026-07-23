import {
  LabourAttendanceEntryMode,
  type CreateLabourAttendanceInput,
  type CreateLabourAttendanceWorkerInput,
} from './types';

export type AttendanceWorkerDraft = {
  workerName: string;
  workerCode?: string;
  checkIn?: string;
  checkOut?: string;
  overtimeHours?: number | string;
  remarks?: string;
};

export type BuildAttendanceCreatePayloadInput = {
  projectId: string;
  contractorId: string;
  attendanceDate: string;
  labourCategoryId: string;
  entryMode: LabourAttendanceEntryMode;
  /** Required for group mode. */
  workerCount?: number | string;
  /** Required for individual mode. */
  workers?: readonly AttendanceWorkerDraft[];
  /** Line-level OT for group; optional override for individual. */
  overtimeHours?: number | string;
  workLocation?: string | null;
  remarks?: string | null;
  submit?: boolean;
  clientDeviceId?: string | null;
  offlineCapturedAt?: string | null;
};

function parseNonNegativeNumber(
  value: number | string | undefined,
  field: string,
): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return n;
}

function normalizeWorkers(
  workers: readonly AttendanceWorkerDraft[] | undefined,
): CreateLabourAttendanceWorkerInput[] {
  const rows: CreateLabourAttendanceWorkerInput[] = [];
  for (const worker of workers ?? []) {
    const workerName = worker.workerName.trim();
    if (!workerName) continue;
    rows.push({
      workerName,
      workerCode: worker.workerCode?.trim() || null,
      checkIn: worker.checkIn?.trim() || null,
      checkOut: worker.checkOut?.trim() || null,
      overtimeHours: parseNonNegativeNumber(
        worker.overtimeHours,
        'worker overtimeHours',
      ),
      remarks: worker.remarks?.trim() || null,
    });
  }
  return rows;
}

/**
 * Builds `POST /labour-attendance` body for group (workerCount) or
 * individual (workers[]) entry modes.
 */
export function buildAttendanceCreatePayload(
  input: BuildAttendanceCreatePayloadInput,
): CreateLabourAttendanceInput {
  if (!input.projectId.trim()) throw new Error('projectId is required');
  if (!input.contractorId.trim()) throw new Error('contractorId is required');
  if (!input.attendanceDate.trim()) {
    throw new Error('attendanceDate is required');
  }
  if (!input.labourCategoryId.trim()) {
    throw new Error('labourCategoryId is required');
  }

  const lineOvertime = parseNonNegativeNumber(
    input.overtimeHours,
    'overtimeHours',
  );

  let line: CreateLabourAttendanceInput['lines'][number];

  if (input.entryMode === LabourAttendanceEntryMode.Individual) {
    const workers = normalizeWorkers(input.workers);
    if (workers.length < 1) {
      throw new Error('Add at least one worker for individual attendance');
    }
    line = {
      labourCategoryId: input.labourCategoryId.trim(),
      entryMode: LabourAttendanceEntryMode.Individual,
      workers,
      overtimeHours: lineOvertime,
    };
  } else if (input.entryMode === LabourAttendanceEntryMode.Group) {
    const count = Math.trunc(
      parseNonNegativeNumber(input.workerCount, 'workerCount'),
    );
    if (count < 1) {
      throw new Error('Worker count must be greater than 0');
    }
    line = {
      labourCategoryId: input.labourCategoryId.trim(),
      entryMode: LabourAttendanceEntryMode.Group,
      workerCount: count,
      overtimeHours: lineOvertime,
    };
  } else {
    throw new Error('entryMode must be group or individual');
  }

  return {
    projectId: input.projectId.trim(),
    contractorId: input.contractorId.trim(),
    attendanceDate: input.attendanceDate.trim(),
    workLocation: input.workLocation?.trim() || null,
    lines: [line],
    remarks: input.remarks?.trim() || null,
    submit: input.submit,
    clientDeviceId: input.clientDeviceId ?? null,
    offlineCapturedAt: input.offlineCapturedAt ?? null,
  };
}
