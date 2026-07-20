import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { luxariaTheme } from '@/theme/theme';
import { PeriodClosePage } from '@/pages/PeriodClosePage';
import { PeriodChecklistItemStatus, type PublicAccountingPeriod } from './types';

const authState = vi.hoisted(() => ({
  permissions: [
    'period_closure.view',
    'period_closure.manage',
    'period_closure.reopen',
    'period_closure.approve_reopen',
    'financial_year.view',
  ] as string[],
  accessLoaded: true,
}));

const { makePeriod, periodState } = vi.hoisted(() => {
  function makePeriod(
    overrides: Partial<PublicAccountingPeriod> = {},
  ): PublicAccountingPeriod {
    return {
      id: '507f1f77bcf86cd799439011',
      periodNumber: 'AP-202607',
      periodType: 'monthly',
      companyId: null,
      financialYearId: '507f1f77bcf86cd799439012',
      year: 2026,
      month: 7,
      periodFrom: '2026-07-01T00:00:00.000Z',
      periodTo: '2026-07-31T23:59:59.999Z',
      status: 'open',
      validationRunAt: '2026-07-20T10:00:00.000Z',
      validationPassed: false,
      checklist: [
        {
          key: 'unposted_journals',
          label: 'Unposted journals',
          status: 'failed',
          issueCount: 1,
          issues: [
            {
              entityType: 'journal',
              entityId: 'j1',
              reference: 'JV-1',
              detail: 'Draft journal open',
            },
          ],
          checkedAt: '2026-07-20T10:00:00.000Z',
        },
      ],
      lockedAt: null,
      closedAt: null,
      notes: null,
      ...overrides,
    };
  }
  return {
    makePeriod,
    periodState: { current: makePeriod() },
  };
});

const listMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: [periodState.current],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
);

const detailMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: periodState.current,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
);

const reopenMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
);

const fyMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: [
      {
        id: '507f1f77bcf86cd799439012',
        name: 'FY 2026-27',
        isCurrent: true,
        isLocked: false,
        status: 'open',
      },
    ],
    isLoading: false,
    error: null,
  })),
);

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Controller' },
    access: authState.accessLoaded
      ? {
          permissions: authState.permissions,
          bypassPermissions: false,
        }
      : null,
    isAuthenticated: true,
    hasPermission: (p: string) => authState.permissions.includes(p),
    hasAnyPermission: (ps: string[]) =>
      ps.some((p) => authState.permissions.includes(p)),
    hasAllPermissions: (ps: string[]) =>
      ps.every((p) => authState.permissions.includes(p)),
  }),
}));

vi.mock('@/components/NotificationProvider', () => ({
  useNotify: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('@/period-close/usePeriodClose', () => ({
  useAccountingPeriodsList: () => listMock(),
  useAccountingPeriodDetail: () => detailMock(),
  usePeriodReopenRequests: () => reopenMock(),
  usePeriodCloseFinancialYears: () => fyMock(),
  useRunPreCloseValidation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCloseAccountingPeriod: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateAccountingPeriod: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useLockAccountingPeriod: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRequestPeriodReopen: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useApprovePeriodReopen: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRejectPeriodReopen: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function renderPage(): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree: ReactElement = (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={luxariaTheme}>
        <CssBaseline />
        <MemoryRouter>
          <PeriodClosePage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return render(tree);
}

describe('PeriodClosePage', () => {
  beforeEach(() => {
    authState.permissions = [
      'period_closure.view',
      'period_closure.manage',
      'period_closure.reopen',
      'period_closure.approve_reopen',
      'financial_year.view',
    ];
    authState.accessLoaded = true;
    periodState.current = makePeriod();
  });

  it('shows permission denied without period_closure.view', () => {
    authState.permissions = [];
    renderPage();
    expect(
      screen.getByText(/Period closure unavailable/i),
    ).toBeInTheDocument();
  });

  it('blocks closure when checklist has unresolved failures', () => {
    renderPage();
    expect(screen.getByTestId('blocking-issues-panel')).toBeInTheDocument();
    expect(screen.getByTestId('open-lock-dialog')).toBeDisabled();
    expect(
      screen.getByText(/resolve all checklist failures|checklist item/i),
    ).toBeInTheDocument();
  });

  it('allows successful lock dialog when validation passed and clear', async () => {
    const user = userEvent.setup();
    periodState.current = makePeriod({
      validationPassed: true,
      checklist: [
        {
          key: 'unposted_journals',
          label: 'Unposted journals',
          status: PeriodChecklistItemStatus.Passed,
          issueCount: 0,
          issues: [],
          checkedAt: '2026-07-20T10:00:00.000Z',
        },
      ],
    });
    renderPage();
    const lockBtn = screen.getByTestId('open-lock-dialog');
    expect(lockBtn).not.toBeDisabled();
    await user.click(lockBtn);
    expect(screen.getByTestId('lock-period-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('lock-period-confirm')).not.toBeDisabled();
    expect(screen.getByTestId('blocking-issues-clear')).toBeInTheDocument();
  });
});
