import { ThemeProvider, createTheme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BookingTable } from './BookingTable';
import { BookingFundingType, BookingStatus, type PublicBooking } from './types';

function booking(
  partial: Partial<PublicBooking> & Pick<PublicBooking, 'id' | 'bookingNumber'>,
): PublicBooking {
  return {
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
    ...partial,
  };
}

function renderTable(rows: PublicBooking[]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <BookingTable
            rows={rows}
            page={1}
            pageSize={20}
            rowCount={rows.length}
            onPageChange={() => undefined}
            onPageSizeChange={() => undefined}
            search=""
            onSearchChange={() => undefined}
          />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('BookingTable — hold expiry display', () => {
  it('shows lapsed hold expiry in error tone', () => {
    renderTable([
      booking({
        id: 'b1',
        bookingNumber: 'BK-2026-000001',
        status: BookingStatus.Hold,
        holdExpiresAt: '2020-01-01T00:00:00.000Z',
      }),
    ]);

    const cell = screen.getByTestId('booking-hold-expiry');
    expect(cell).toHaveAttribute('data-tone', 'lapsed');
    expect(cell.textContent).toMatch(/Lapsed/i);
    expect(screen.getByText('BK-2026-000001')).toBeInTheDocument();
    expect(screen.getByTestId('booking-status-chip')).toHaveAttribute(
      'data-status',
      'hold',
    );
  });

  it('shows expired status hold clearly', () => {
    renderTable([
      booking({
        id: 'b2',
        bookingNumber: 'BK-2026-000002',
        status: BookingStatus.Expired,
        holdExpiresAt: null,
        expiredAt: '2026-07-19T10:00:00.000Z',
      }),
    ]);

    const cell = screen.getByTestId('booking-hold-expiry');
    expect(cell).toHaveAttribute('data-tone', 'expired');
    expect(cell.textContent).toMatch(/Expired/i);
  });

  it('shows invalid when hold is missing expiry', () => {
    renderTable([
      booking({
        id: 'b3',
        bookingNumber: 'BK-2026-000003',
        status: BookingStatus.Hold,
        holdExpiresAt: null,
      }),
    ]);

    const cell = screen.getByTestId('booking-hold-expiry');
    expect(cell).toHaveAttribute('data-tone', 'invalid');
    expect(cell.textContent).toMatch(/No expiry/i);
  });
});
