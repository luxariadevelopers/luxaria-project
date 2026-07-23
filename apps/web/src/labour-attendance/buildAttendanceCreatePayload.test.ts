import { describe, expect, it } from 'vitest';
import { buildAttendanceCreatePayload } from './buildAttendanceCreatePayload';
import { LabourAttendanceEntryMode } from './types';

const base = {
  projectId: '507f1f77bcf86cd799439011',
  contractorId: '507f1f77bcf86cd799439012',
  attendanceDate: '2026-07-20',
  labourCategoryId: '507f1f77bcf86cd799439013',
};

describe('buildAttendanceCreatePayload', () => {
  it('builds group payload with workerCount (no workers array)', () => {
    const payload = buildAttendanceCreatePayload({
      ...base,
      entryMode: LabourAttendanceEntryMode.Group,
      workerCount: '8',
      overtimeHours: '2',
      submit: false,
    });

    expect(payload.lines).toHaveLength(1);
    expect(payload.lines[0]).toEqual({
      labourCategoryId: base.labourCategoryId,
      entryMode: LabourAttendanceEntryMode.Group,
      workerCount: 8,
      overtimeHours: 2,
    });
    expect(payload.lines[0].workers).toBeUndefined();
    expect(payload.submit).toBe(false);
  });

  it('builds individual payload with workers[] (no workerCount)', () => {
    const payload = buildAttendanceCreatePayload({
      ...base,
      entryMode: LabourAttendanceEntryMode.Individual,
      workers: [
        {
          workerName: 'Ravi Kumar',
          workerCode: 'W-001',
          overtimeHours: '1',
        },
        { workerName: '  ' },
        { workerName: 'Anitha', overtimeHours: 0 },
      ],
    });

    expect(payload.lines[0].entryMode).toBe(
      LabourAttendanceEntryMode.Individual,
    );
    expect(payload.lines[0].workerCount).toBeUndefined();
    expect(payload.lines[0].workers).toEqual([
      {
        workerName: 'Ravi Kumar',
        workerCode: 'W-001',
        checkIn: null,
        checkOut: null,
        overtimeHours: 1,
        remarks: null,
      },
      {
        workerName: 'Anitha',
        workerCode: null,
        checkIn: null,
        checkOut: null,
        overtimeHours: 0,
        remarks: null,
      },
    ]);
  });

  it('rejects invalid group/individual drafts', () => {
    expect(() =>
      buildAttendanceCreatePayload({
        ...base,
        entryMode: LabourAttendanceEntryMode.Group,
        workerCount: 0,
      }),
    ).toThrow(/worker count/i);

    expect(() =>
      buildAttendanceCreatePayload({
        ...base,
        entryMode: LabourAttendanceEntryMode.Individual,
        workers: [],
      }),
    ).toThrow(/at least one worker/i);
  });
});
