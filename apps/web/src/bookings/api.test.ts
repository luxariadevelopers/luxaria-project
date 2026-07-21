import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingStatus } from '@/status';
import {
  approveDiscount,
  cancelBooking,
  createBooking,
  fetchBooking,
  fetchBookings,
  rejectDiscount,
  transitionBooking,
  updateBooking,
} from './api';
import { BookingFundingType } from './types';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
}));

const sampleBooking = {
  id: '507f1f77bcf86cd799439099',
  bookingNumber: 'BK-2026-000001',
  customerId: '507f1f77bcf86cd799439011',
  jointApplicantId: null,
  projectId: '507f1f77bcf86cd799439012',
  unitId: '507f1f77bcf86cd799439013',
  bookingDate: '2026-07-18T00:00:00.000Z',
  bookingAmount: 200_000,
  agreedPrice: 7_500_000,
  discount: 0,
  approvedPrice: 7_500_000,
  paymentPlan: { name: null, installments: [] },
  broker: {
    name: null,
    firmName: null,
    phone: null,
    email: null,
    commissionPercent: null,
  },
  fundingType: BookingFundingType.OwnFunds,
  remarks: null,
  status: BookingStatus.Hold,
  holdExpiresAt: '2026-07-20T08:00:00.000Z',
  discountApprovalRequired: false,
  discountApproved: false,
  approvalRequestId: null,
  pdfPath: null,
  pdfGeneratedAt: null,
  expiredAt: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-07-18T10:00:00.000Z',
  updatedAt: '2026-07-18T10:00:00.000Z',
};

describe('bookings API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
  });

  it('lists bookings with filters', async () => {
    apiGet.mockResolvedValue({
      success: true,
      data: [sampleBooking],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    const result = await fetchBookings({
      projectId: '507f1f77bcf86cd799439012',
      status: BookingStatus.Hold,
    });

    expect(apiGet).toHaveBeenCalledWith('/bookings', {
      page: 1,
      limit: 20,
      search: undefined,
      status: BookingStatus.Hold,
      projectId: '507f1f77bcf86cd799439012',
      unitId: undefined,
      customerId: undefined,
      sortOrder: undefined,
    });
    expect(result.items[0]?.bookingNumber).toBe('BK-2026-000001');
  });

  it('gets booking by id', async () => {
    apiGet.mockResolvedValue({ success: true, data: sampleBooking });
    const row = await fetchBooking(sampleBooking.id);
    expect(apiGet).toHaveBeenCalledWith(
      `/bookings/${encodeURIComponent(sampleBooking.id)}`,
    );
    expect(row.status).toBe(BookingStatus.Hold);
  });

  it('creates booking', async () => {
    apiPost.mockResolvedValue({ success: true, data: sampleBooking });
    const input = {
      customerId: sampleBooking.customerId,
      projectId: sampleBooking.projectId,
      unitId: sampleBooking.unitId,
      bookingAmount: 200_000,
      agreedPrice: 7_500_000,
      fundingType: BookingFundingType.OwnFunds,
    };
    const row = await createBooking(input);
    expect(apiPost).toHaveBeenCalledWith('/bookings', input);
    expect(row.id).toBe(sampleBooking.id);
  });

  it('updates booking', async () => {
    apiPatch.mockResolvedValue({ success: true, data: sampleBooking });
    const row = await updateBooking(sampleBooking.id, { remarks: 'Updated' });
    expect(apiPatch).toHaveBeenCalledWith(
      `/bookings/${encodeURIComponent(sampleBooking.id)}`,
      { remarks: 'Updated' },
    );
    expect(row.bookingNumber).toBe('BK-2026-000001');
  });

  it('transitions booking', async () => {
    apiPost.mockResolvedValue({
      success: true,
      data: { ...sampleBooking, status: BookingStatus.Reserved },
    });
    const row = await transitionBooking(sampleBooking.id, {
      status: BookingStatus.Reserved,
    });
    expect(apiPost).toHaveBeenCalledWith(
      `/bookings/${encodeURIComponent(sampleBooking.id)}/transition`,
      { status: BookingStatus.Reserved },
    );
    expect(row.status).toBe(BookingStatus.Reserved);
  });

  it('approves discount', async () => {
    apiPost.mockResolvedValue({ success: true, data: sampleBooking });
    await approveDiscount(sampleBooking.id, { comment: 'ok' });
    expect(apiPost).toHaveBeenCalledWith(
      `/bookings/${encodeURIComponent(sampleBooking.id)}/approve-discount`,
      { comment: 'ok' },
    );
  });

  it('rejects discount', async () => {
    apiPost.mockResolvedValue({
      success: true,
      data: { ...sampleBooking, status: BookingStatus.Cancelled },
    });
    const row = await rejectDiscount(sampleBooking.id, {
      reason: 'Too high',
    });
    expect(apiPost).toHaveBeenCalledWith(
      `/bookings/${encodeURIComponent(sampleBooking.id)}/reject-discount`,
      { reason: 'Too high' },
    );
    expect(row.status).toBe(BookingStatus.Cancelled);
  });

  it('cancels booking', async () => {
    apiPost.mockResolvedValue({
      success: true,
      data: { ...sampleBooking, status: BookingStatus.Cancelled },
    });
    const row = await cancelBooking(sampleBooking.id, { reason: 'Buyer withdrew' });
    expect(apiPost).toHaveBeenCalledWith(
      `/bookings/${encodeURIComponent(sampleBooking.id)}/cancel`,
      { reason: 'Buyer withdrew' },
    );
    expect(row.status).toBe(BookingStatus.Cancelled);
  });
});
