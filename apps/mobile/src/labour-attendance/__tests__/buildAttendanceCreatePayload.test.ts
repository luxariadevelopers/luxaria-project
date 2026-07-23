import { buildAttendanceCreatePayload } from '../buildAttendanceCreatePayload';
import { LabourAttendanceEntryMode } from '../types';

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
      workerCount: '12',
      overtimeHours: '3',
      submit: true,
    });

    expect(payload.lines).toHaveLength(1);
    expect(payload.lines[0]).toEqual({
      labourCategoryId: base.labourCategoryId,
      entryMode: LabourAttendanceEntryMode.Group,
      workerCount: 12,
      overtimeHours: 3,
    });
    expect(payload.lines[0].workers).toBeUndefined();
    expect(payload.submit).toBe(true);
  });

  it('builds individual payload with workers[] (no workerCount)', () => {
    const payload = buildAttendanceCreatePayload({
      ...base,
      entryMode: LabourAttendanceEntryMode.Individual,
      workers: [
        {
          workerName: 'Ravi Kumar',
          workerCode: 'w-001',
          checkIn: '2026-07-20T08:00:00.000Z',
          checkOut: '2026-07-20T17:00:00.000Z',
          overtimeHours: '1.5',
          remarks: 'Tower A',
        },
        { workerName: '  ', overtimeHours: '0' },
        { workerName: 'Anitha', overtimeHours: 0 },
      ],
      overtimeHours: 0,
    });

    expect(payload.lines[0].entryMode).toBe(
      LabourAttendanceEntryMode.Individual,
    );
    expect(payload.lines[0].workerCount).toBeUndefined();
    expect(payload.lines[0].workers).toEqual([
      {
        workerName: 'Ravi Kumar',
        workerCode: 'w-001',
        checkIn: '2026-07-20T08:00:00.000Z',
        checkOut: '2026-07-20T17:00:00.000Z',
        overtimeHours: 1.5,
        remarks: 'Tower A',
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

  it('rejects group with zero workers and individual with no names', () => {
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
        workers: [{ workerName: '  ' }],
      }),
    ).toThrow(/at least one worker/i);
  });
});
