import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { luxariaTheme } from '@/theme/theme';
import { ApprovalsPage } from '@/pages/ApprovalsPage';

const authState = vi.hoisted(() => ({
  permissions: ['approval.view'] as string[],
  accessLoaded: true,
}));

const projectState = vi.hoisted(() => ({
  selectedProjectId: '507f1f77bcf86cd799439011' as string | null,
  projects: [
    {
      id: '507f1f77bcf86cd799439011',
      projectCode: 'LX-01',
      projectName: 'Tower A',
    },
    {
      id: '507f1f77bcf86cd799439012',
      projectCode: 'LX-02',
      projectName: 'Tower B',
    },
  ],
}));

const listMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
);

const pendingMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: 0,
    isLoading: false,
    error: null,
  })),
);

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Approver' },
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

vi.mock('@/context/ProjectContext', () => ({
  useProject: () => ({
    selectedProjectId: projectState.selectedProjectId,
    selectedProject: projectState.projects.find(
      (p) => p.id === projectState.selectedProjectId,
    ) ?? null,
    projects: projectState.projects,
    setSelectedProjectId: vi.fn((id: string | null) => {
      projectState.selectedProjectId = id;
    }),
    isLoading: false,
    isReady: true,
    error: null,
    hasNoProjectAccess: false,
    needsProjectSelection: false,
    selectionIssue: null,
    globalAccess: false,
    access: { globalAccess: false, projectIds: projectState.projects.map((p) => p.id) },
    allProjects: projectState.projects,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/approvals/useApprovals', () => ({
  useApprovalsList: (
    projectId: string | null,
    query: { status?: string; module?: string },
    enabled: boolean,
  ) => listMock(projectId, query, enabled),
  usePendingApprovalCount: (projectId: string | null, enabled: boolean) =>
    pendingMock(projectId, enabled),
}));

function renderPage(): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const ui: ReactElement = (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={luxariaTheme}>
        <CssBaseline />
        <MemoryRouter>
          <ApprovalsPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return render(ui);
}

describe('ApprovalsPage role / project filtering', () => {
  beforeEach(() => {
    authState.permissions = ['approval.view'];
    authState.accessLoaded = true;
    projectState.selectedProjectId = '507f1f77bcf86cd799439011';
    listMock.mockClear();
    pendingMock.mockClear();
    listMock.mockImplementation(() => ({
      data: { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));
  });

  it('denies access without approval.view', () => {
    authState.permissions = ['project.view'];
    renderPage();
    expect(screen.getByText('Approvals unavailable')).toBeInTheDocument();
    // Hook may mount before early return; query must stay disabled.
    if (listMock.mock.calls.length > 0) {
      const enabled = listMock.mock.calls[0]?.[2];
      expect(enabled).toBe(false);
    }
  });

  it('requires a selected project before listing', () => {
    projectState.selectedProjectId = null;
    renderPage();
    expect(screen.getByText('Project required')).toBeInTheDocument();
  });

  it('lists against the selected project with default pending status', () => {
    renderPage();
    expect(listMock).toHaveBeenCalled();
    const [projectId, query, enabled] = listMock.mock.calls[0] as [
      string,
      { status?: string },
      boolean,
    ];
    expect(projectId).toBe('507f1f77bcf86cd799439011');
    expect(query.status).toBe('pending');
    expect(enabled).toBe(true);
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
  });
});
