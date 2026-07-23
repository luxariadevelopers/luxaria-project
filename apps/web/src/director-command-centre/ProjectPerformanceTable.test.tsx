import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { luxariaTheme } from '@/theme/theme';
import {
  ProjectPerformanceTable,
  type ProjectPerformanceRowState,
} from './ProjectPerformanceTable';
import type { ProjectDashboardSummary } from './projectDashboardTypes';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
  }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-20T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

function wrap(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={luxariaTheme}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );
}

function money(amount: number) {
  return { amount, drillDown: [] as [] };
}

function percent(value: number) {
  return {
    percent: value,
    numerator: value,
    denominator: 100,
    drillDown: [] as [],
  };
}

function sampleSummary(
  overrides: Partial<ProjectDashboardSummary> = {},
): ProjectDashboardSummary {
  return {
    filters: {
      projectId: 'p1',
      date: '2026-07-19T00:00:00.000Z',
      from: null,
      to: null,
    },
    project: {
      id: 'p1',
      projectCode: 'PRJ-A',
      projectName: 'Alpha',
      projectStage: 'construction',
      status: 'Active',
    },
    capitalPlan: {
      approvedBudget: 1_000_000,
      totalInvested: 0,
      pendingToInvest: 1_000_000,
      equalDirectorInvestment: false,
      directorsEqual: false,
      directors: [],
      investors: [],
      drillDown: [],
    },
    projectStage: {
      stage: 'construction',
      status: 'Active',
      drillDown: [],
    },
    physicalCompletion: percent(40),
    financialCompletion: percent(25),
    approvedBudget: money(1_000_000),
    revisedBudget: money(0),
    actualCost: money(250_000),
    committedCost: money(0),
    forecastCostToComplete: money(750_000),
    projectedFinalCost: money(1_000_000),
    customerCollections: money(0),
    investorFunding: {
      committedAmount: 0,
      receivedAmount: 0,
      pendingAmount: 0,
      commitmentCount: 0,
      drillDown: [],
    },
    bankBalance: money(0),
    cashBalance: money(0),
    materialStock: {
      materialCount: 0,
      totalQuantity: 0,
      locations: 0,
      drillDown: [],
    },
    labourAttendance: {
      asOfDate: '2026-07-18T00:00:00.000Z',
      sheetCount: 0,
      totalWorkers: 0,
      confirmedSheets: 0,
      submittedSheets: 0,
      drillDown: [],
    },
    contractorProgress: [],
    vendorDues: money(0),
    purchaseOrders: {
      count: 0,
      issuedCount: 0,
      totalValue: 0,
      openBalance: 0,
      drillDown: [],
    },
    sitePhotos: { count: 0, recent: [], drillDown: [] },
    criticalAlerts: [
      {
        code: 'X',
        severity: 'critical',
        message: 'Test',
        count: 2,
        drillDown: [],
      },
    ],
    ...overrides,
  };
}

describe('ProjectPerformanceTable', () => {
  it('shows empty state when there are no projects', () => {
    wrap(<ProjectPerformanceTable rows={[]} />);
    expect(screen.getByText('No projects to compare')).toBeInTheDocument();
  });

  it('renders multi-project rows with stale highlight', () => {
    const rows: ProjectPerformanceRowState[] = [
      {
        projectId: 'p1',
        data: sampleSummary(),
        isError: false,
        isLoading: false,
        refetch: vi.fn(),
      },
      {
        projectId: 'p2',
        data: sampleSummary({
          filters: {
            projectId: 'p2',
            date: '2026-07-20T00:00:00.000Z',
            from: null,
            to: null,
          },
          project: {
            id: 'p2',
            projectCode: 'PRJ-B',
            projectName: 'Beta',
            projectStage: 'planning',
            status: 'Active',
          },
          labourAttendance: {
            asOfDate: '2026-07-20T00:00:00.000Z',
            sheetCount: 0,
            totalWorkers: 0,
            confirmedSheets: 0,
            submittedSheets: 0,
            drillDown: [],
          },
          criticalAlerts: [],
        }),
        isError: false,
        isLoading: false,
        refetch: vi.fn(),
      },
    ];

    // Freeze “today” relative to sample: stale helper uses real Date — use past as-of
    // which is before real today (2026-07-20 in user_info). PRJ-A as-of 07-19 is stale.
    wrap(<ProjectPerformanceTable rows={rows} />);

    expect(screen.getByText('PRJ-A')).toBeInTheDocument();
    expect(screen.getByText('PRJ-B')).toBeInTheDocument();
    expect(screen.getByTestId('stale-as-of')).toBeInTheDocument();
    expect(screen.getByTestId('stale-labour')).toBeInTheDocument();
    expect(screen.getAllByTestId('progress-bar-cell').length).toBeGreaterThan(
      0,
    );
  });

  it('shows loading state for initial fetch', () => {
    wrap(
      <ProjectPerformanceTable
        loading
        rows={[
          {
            projectId: 'p1',
            isError: false,
            isLoading: true,
            refetch: vi.fn(),
          },
        ]}
      />,
    );
    expect(
      screen.getByTestId('project-performance-loading'),
    ).toBeInTheDocument();
  });
});
