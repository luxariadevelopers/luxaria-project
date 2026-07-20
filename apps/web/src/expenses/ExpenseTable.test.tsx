import { ThemeProvider, createTheme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExpenseTable } from './ExpenseTable';
import type { ExpenseCapabilities } from './roleAccess';
import {
  SiteExpenseAttachmentType,
  SiteExpensePaymentMode,
  SiteExpenseVoucherStatus,
  type PublicSiteExpenseVoucher,
} from './types';

const caps: ExpenseCapabilities = {
  canView: true,
  canCreate: false,
  canVerify: true,
  canApprove: true,
  canPost: true,
};

function voucher(
  partial: Partial<PublicSiteExpenseVoucher> &
    Pick<PublicSiteExpenseVoucher, 'id' | 'voucherNumber'>,
): PublicSiteExpenseVoucher {
  return {
    projectId: 'p1',
    pettyCashAccountId: 'c1',
    expenseDate: '2026-07-15',
    expenseCategoryId: 'cat1',
    amount: 1500,
    paidTo: 'Ravi Kumar',
    mobileNumber: null,
    purpose: 'Scaffolding labour',
    boqItemId: null,
    paymentMode: SiteExpensePaymentMode.Cash,
    billNumber: 'B-1',
    billDate: null,
    attachments: [],
    latitude: null,
    longitude: null,
    deviceId: null,
    submittedBy: null,
    submittedAt: null,
    status: SiteExpenseVoucherStatus.Submitted,
    warnings: [],
    journalEntryId: null,
    debitAccountId: null,
    verifiedBy: null,
    verifiedAt: null,
    approvedBy: null,
    approvedAt: null,
    postedBy: null,
    postedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    ...partial,
  };
}

function renderTable(rows: PublicSiteExpenseVoucher[]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={createTheme()}>
        <ExpenseTable
          rows={rows}
          page={1}
          pageSize={20}
          rowCount={rows.length}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
          search=""
          onSearchChange={() => undefined}
          caps={caps}
        />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('ExpenseTable — evidence and warnings', () => {
  it('shows evidence count and GPS / duplicate badges', async () => {
    renderTable([
      voucher({
        id: 'e1',
        voucherNumber: 'EXP-2026-000001',
        attachments: [
          {
            id: 'a1',
            type: SiteExpenseAttachmentType.Bill,
            fileName: 'bill.pdf',
            filePath: '/bill.pdf',
            documentId: null,
            mimeType: 'application/pdf',
          },
        ],
        warnings: [
          'GPS is outside project radius (900m > 500m)',
          'Possible duplicate bill (EXP-2026-000099)',
        ],
      }),
    ]);

    expect(await screen.findByTestId('expense-evidence-count')).toHaveAttribute(
      'data-count',
      '1',
    );
    expect(screen.getByTestId('expense-gps-warning')).toBeInTheDocument();
    expect(screen.getByTestId('expense-duplicate-warning')).toBeInTheDocument();
    expect(screen.getByText('EXP-2026-000001')).toBeInTheDocument();
  });

  it('flags zero evidence without risk badges when warnings empty', async () => {
    renderTable([
      voucher({
        id: 'e2',
        voucherNumber: 'EXP-2026-000002',
        attachments: [],
        warnings: [],
      }),
    ]);

    expect(await screen.findByTestId('expense-evidence-count')).toHaveAttribute(
      'data-count',
      '0',
    );
    expect(screen.queryByTestId('expense-gps-warning')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('expense-duplicate-warning'),
    ).not.toBeInTheDocument();
  });
});
