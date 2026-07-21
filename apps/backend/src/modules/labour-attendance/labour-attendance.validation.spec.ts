import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  assertGps,
  assertOvertimeHours,
  assertReadyForSubmit,
  assertShift,
  assertWorkerTimes,
  attendanceDateKey,
  MAX_WORKER_OVERTIME_HOURS,
  mergeDocumentIds,
  normalizeAttendanceDate,
  normalizeAttendanceLines,
} from './labour-attendance.validation';
import {
  LabourAttendanceEntryMode,
  LabourAttendanceShift,
} from './schemas/labour-attendance.schema';

describe('labour-attendance.validation', () => {
  it('normalizes attendanceDate to UTC midnight', () => {
    const date = normalizeAttendanceDate('2026-07-20T15:30:00.000Z');
    expect(attendanceDateKey(date)).toBe('2026-07-20');
    expect(date.getUTCHours()).toBe(0);
  });

  it('validates GPS bounds', () => {
    expect(() => assertGps(13.08, 80.27)).not.toThrow();
    expect(() => assertGps(100, 80)).toThrow(BadRequestException);
    expect(() => assertGps(13, 200)).toThrow(BadRequestException);
  });

  it('merges offline group_photo attachments', () => {
    const ids = mergeDocumentIds({
      ids: ['aaaaaaaaaaaaaaaaaaaaaaaa'],
      attachments: {
        group_photo_0: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        other: 'ignored',
      },
      prefix: 'group_photo',
    });
    expect(ids).toEqual([
      'aaaaaaaaaaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
    ]);
  });

  it('supports group and individual lines', () => {
    const categoryA = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const categoryB = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    const lines = normalizeAttendanceLines([
      {
        labourCategoryId: categoryA,
        entryMode: LabourAttendanceEntryMode.Group,
        workerCount: 10,
        overtimeHours: 2,
      },
      {
        labourCategoryId: categoryB,
        entryMode: LabourAttendanceEntryMode.Individual,
        workers: [
          {
            workerName: 'Ravi',
            workerCode: 'W-1',
            checkIn: '2026-07-20T08:00:00.000Z',
            checkOut: '2026-07-20T18:00:00.000Z',
            overtimeHours: 1,
          },
          {
            workerName: 'Kumar',
            overtimeHours: 0.5,
          },
        ],
      },
    ]);

    expect(lines[0].workerCount).toBe(10);
    expect(lines[1].workerCount).toBe(2);
    expect(lines[1].overtimeHours).toBe(1.5);
  });

  it('detects duplicate labour category and worker identity', () => {
    const categoryId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    expect(() =>
      normalizeAttendanceLines([
        {
          labourCategoryId: categoryId,
          entryMode: LabourAttendanceEntryMode.Group,
          workerCount: 5,
        },
        {
          labourCategoryId: categoryId,
          entryMode: LabourAttendanceEntryMode.Group,
          workerCount: 3,
        },
      ]),
    ).toThrow(ConflictException);

    expect(() =>
      normalizeAttendanceLines([
        {
          labourCategoryId: categoryId,
          entryMode: LabourAttendanceEntryMode.Individual,
          workers: [
            { workerName: 'Ravi', workerCode: 'W-1' },
            { workerName: 'Other', workerCode: 'W-1' },
          ],
        },
      ]),
    ).toThrow(ConflictException);

    expect(() =>
      normalizeAttendanceLines([
        {
          labourCategoryId: categoryId,
          entryMode: LabourAttendanceEntryMode.Individual,
          workers: [
            { workerName: 'Ravi Kumar' },
            { workerName: ' ravi   kumar ' },
          ],
        },
      ]),
    ).toThrow(ConflictException);
  });

  it('rejects checkOut before checkIn and incomplete submit payload', () => {
    expect(() =>
      assertWorkerTimes({
        checkIn: new Date('2026-07-20T10:00:00.000Z'),
        checkOut: new Date('2026-07-20T09:00:00.000Z'),
        label: 'worker',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertReadyForSubmit({
        lines: [{}],
        latitude: null,
        longitude: 80,
        groupPhotoDocumentIds: ['aaaaaaaaaaaaaaaaaaaaaaaa'],
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertReadyForSubmit({
        lines: [{}],
        latitude: 13,
        longitude: 80,
        groupPhotoDocumentIds: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('validates shift enum and defaults to general', () => {
    expect(assertShift(undefined)).toBe(LabourAttendanceShift.General);
    expect(assertShift(LabourAttendanceShift.Night)).toBe(
      LabourAttendanceShift.Night,
    );
    expect(() => assertShift('swing')).toThrow(BadRequestException);
  });

  it('rejects overtime above per-worker ceiling', () => {
    expect(() =>
      assertOvertimeHours(
        MAX_WORKER_OVERTIME_HOURS + 0.1,
        'overtimeHours',
        MAX_WORKER_OVERTIME_HOURS,
      ),
    ).toThrow(BadRequestException);

    const categoryId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    expect(() =>
      normalizeAttendanceLines([
        {
          labourCategoryId: categoryId,
          entryMode: LabourAttendanceEntryMode.Individual,
          workers: [
            {
              workerName: 'Ravi',
              overtimeHours: MAX_WORKER_OVERTIME_HOURS + 1,
            },
          ],
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it('accepts checkInAt / checkOutAt aliases', () => {
    const categoryId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const [line] = normalizeAttendanceLines([
      {
        labourCategoryId: categoryId,
        entryMode: LabourAttendanceEntryMode.Individual,
        workers: [
          {
            workerName: 'Ravi',
            checkInAt: '2026-07-20T08:00:00.000Z',
            checkOutAt: '2026-07-20T17:00:00.000Z',
            overtimeHours: 1,
          },
        ],
      },
    ]);
    expect(line.workers[0].checkIn?.toISOString()).toBe(
      '2026-07-20T08:00:00.000Z',
    );
    expect(line.workers[0].checkOut?.toISOString()).toBe(
      '2026-07-20T17:00:00.000Z',
    );
  });
});
