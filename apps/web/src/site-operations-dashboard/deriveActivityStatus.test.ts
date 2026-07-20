import { describe, expect, it } from 'vitest';
import type { ProjectDashboardSummary } from '@/director-command-centre/projectDashboardTypes';
import {
  deriveAttendanceStatus,
  deriveDprStatus,
  deriveGrnStatus,
  deriveStockStatus,
} from './deriveActivityStatus';

describe('deriveDprStatus (cut-off + missing)', () => {
  it('marks missing when unacknowledged missing-DPR alerts exist', () => {
    expect(
      deriveDprStatus({
        dprsForDay: [],
        missingAlertCount: 2,
      }),
    ).toBe('missing');
  });

  it('is awaiting_cutoff when no DPR and no alert yet', () => {
    expect(
      deriveDprStatus({
        dprsForDay: [],
        missingAlertCount: 0,
      }),
    ).toBe('awaiting_cutoff');
  });

  it('is complete when submitted or reviewed', () => {
    expect(
      deriveDprStatus({
        dprsForDay: [{ id: '1', status: 'submitted' }],
        missingAlertCount: 0,
      }),
    ).toBe('complete');
    expect(
      deriveDprStatus({
        dprsForDay: [{ id: '1', status: 'reviewed' }],
        missingAlertCount: 0,
      }),
    ).toBe('complete');
  });

  it('is pending for draft / reopened', () => {
    expect(
      deriveDprStatus({
        dprsForDay: [{ id: '1', status: 'draft' }],
        missingAlertCount: 0,
      }),
    ).toBe('pending');
  });
});

describe('deriveAttendanceStatus (missing data)', () => {
  it('is missing when sheetCount is zero', () => {
    expect(
      deriveAttendanceStatus(
        {
          projectId: 'p1',
          attendanceDate: '2026-07-20',
          sheetCount: 0,
          totalWorkers: 0,
          confirmedCount: 0,
          pendingConfirmationCount: 0,
        },
        null,
      ),
    ).toBe('missing');
  });

  it('is complete when all sheets confirmed', () => {
    expect(
      deriveAttendanceStatus(
        {
          projectId: 'p1',
          attendanceDate: '2026-07-20',
          sheetCount: 2,
          totalWorkers: 10,
          confirmedCount: 2,
          pendingConfirmationCount: 0,
        },
        null,
      ),
    ).toBe('complete');
  });
});

describe('deriveGrnStatus / deriveStockStatus', () => {
  it('treats empty GRN day as missing', () => {
    expect(deriveGrnStatus([])).toBe('missing');
  });

  it('treats posted-only GRNs as complete', () => {
    expect(
      deriveGrnStatus([{ id: 'g1', status: 'posted', receivedDate: '2026-07-20' }]),
    ).toBe('complete');
  });

  it('flags stock when MATERIAL_STOCK alert is open', () => {
    const dashboard = {
      materialStock: { materialCount: 3, totalQuantity: 10, locations: 1, drillDown: [] },
      criticalAlerts: [
        {
          code: 'MATERIAL_STOCK',
          severity: 'warning' as const,
          message: 'Open material stock reorder alerts',
          count: 2,
          drillDown: [],
        },
      ],
    } as unknown as ProjectDashboardSummary;
    expect(deriveStockStatus(dashboard)).toBe('pending');
  });

  it('is unavailable when dashboard is null', () => {
    expect(deriveStockStatus(null)).toBe('unavailable');
  });
});
