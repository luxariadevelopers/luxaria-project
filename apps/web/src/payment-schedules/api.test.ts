import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approvePaymentSchedule,
  fetchOverdueScheduleLines,
  fetchPaymentSchedule,
  fetchPaymentSchedules,
  generatePaymentDemand,
  generatePaymentSchedule,
  markScheduleLineDue,
  rejectPaymentSchedule,
  revisePaymentSchedule,
  runMarkOverdueJob,
  submitPaymentScheduleForApproval,
} from './api';
import {
  PaymentScheduleStatus,
  PaymentScheduleType,
} from './types';

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
}));

const sampleSchedule = {
  id: 'ps1',
  scheduleNumber: 'PS-001',
  bookingId: 'b1',
  projectId: 'p1',
  customerId: 'c1',
  unitId: 'u1',
  scheduleType: PaymentScheduleType.DateBased,
  totalAmount: 1_000_000,
  lines: [
    {
      id: 'l1',
      sequence: 1,
      milestone: 'Booking',
      dueDate: '2026-08-01',
      percentage: 100,
      amount: 1_000_000,
      tax: 0,
      collectedAmount: 0,
      status: 'pending',
      demandId: null,
      markedDueAt: null,
      overdueAt: null,
    },
  ],
  status: PaymentScheduleStatus.Draft,
  revisionNumber: 1,
  rootScheduleId: 'ps1',
  revisedFromId: null,
  approvalRequestId: null,
  remarks: null,
  overdueLineCount: 0,
  createdAt: '2026-07-01T10:00:00.000Z',
};

describe('payment-schedules API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
  });

  it('lists schedules with filters', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [sampleSchedule],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    const result = await fetchPaymentSchedules({
      page: 1,
      limit: 20,
      projectId: 'p1',
      status: PaymentScheduleStatus.Active,
    });

    expect(apiGet).toHaveBeenCalledWith('/payment-schedules', {
      page: 1,
      limit: 20,
      search: undefined,
      status: PaymentScheduleStatus.Active,
      scheduleType: undefined,
      bookingId: undefined,
      projectId: 'p1',
      customerId: undefined,
      sortOrder: undefined,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.scheduleNumber).toBe('PS-001');
  });

  it('fetches schedule by id', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: sampleSchedule,
    });

    const row = await fetchPaymentSchedule('ps1');
    expect(apiGet).toHaveBeenCalledWith('/payment-schedules/ps1');
    expect(row.id).toBe('ps1');
  });

  it('lists overdue lines', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          scheduleId: 'ps1',
          scheduleNumber: 'PS-001',
          bookingId: 'b1',
          customerId: 'c1',
          projectId: 'p1',
          line: {
            id: 'l1',
            sequence: 1,
            milestone: 'Booking',
            dueDate: '2026-06-01',
            percentage: 100,
            amount: 1_000_000,
            tax: 0,
            status: 'overdue',
            overdueAt: '2026-07-01T00:00:00.000Z',
            demandId: null,
          },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const result = await fetchOverdueScheduleLines({ page: 1, limit: 20 });
    expect(apiGet).toHaveBeenCalledWith('/payment-schedules/overdue', {
      page: 1,
      limit: 20,
    });
    expect(result.items[0]?.line.status).toBe('overdue');
  });

  it('posts generate and workflow mutations', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: sampleSchedule,
    });

    await generatePaymentSchedule({
      bookingId: 'b1',
      scheduleType: PaymentScheduleType.DateBased,
    });
    expect(apiPost).toHaveBeenCalledWith('/payment-schedules/generate', {
      bookingId: 'b1',
      scheduleType: PaymentScheduleType.DateBased,
    });

    await submitPaymentScheduleForApproval('ps1');
    expect(apiPost).toHaveBeenCalledWith(
      '/payment-schedules/ps1/submit-approval',
    );

    await approvePaymentSchedule('ps1', { comment: 'ok' });
    expect(apiPost).toHaveBeenCalledWith('/payment-schedules/ps1/approve', {
      comment: 'ok',
    });

    await rejectPaymentSchedule('ps1', { reason: 'no' });
    expect(apiPost).toHaveBeenCalledWith('/payment-schedules/ps1/reject', {
      reason: 'no',
    });

    await revisePaymentSchedule('ps1', {
      lines: [{ sequence: 1, milestone: 'A', percentage: 100, amount: 1 }],
    });
    expect(apiPost).toHaveBeenCalledWith('/payment-schedules/ps1/revise', {
      lines: [{ sequence: 1, milestone: 'A', percentage: 100, amount: 1 }],
    });

    await markScheduleLineDue('ps1', { lineId: 'l1' });
    expect(apiPost).toHaveBeenCalledWith('/payment-schedules/ps1/mark-due', {
      lineId: 'l1',
    });
  });

  it('posts generate demand and mark-overdue job', async () => {
    apiPost.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: {
        schedule: sampleSchedule,
        demand: {
          id: 'd1',
          demandNumber: 'PD-001',
          scheduleId: 'ps1',
          lineId: 'l1',
          bookingId: 'b1',
          projectId: 'p1',
          customerId: 'c1',
          milestone: 'Booking',
          dueDate: '2026-08-01',
          amount: 1_000_000,
          tax: 0,
          totalAmount: 1_000_000,
          status: 'issued',
          issuedAt: '2026-07-02T10:00:00.000Z',
          issuedBy: 'u1',
        },
      },
    });

    const demandResult = await generatePaymentDemand('ps1', { lineId: 'l1' });
    expect(apiPost).toHaveBeenCalledWith('/payment-schedules/ps1/demands', {
      lineId: 'l1',
    });
    expect(demandResult.demand.demandNumber).toBe('PD-001');

    apiPost.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: { marked: 2, schedulesChecked: 5 },
    });
    const job = await runMarkOverdueJob();
    expect(apiPost).toHaveBeenCalledWith('/payment-schedules/jobs/mark-overdue');
    expect(job.marked).toBe(2);
  });
});
