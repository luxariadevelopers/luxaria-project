import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { luxariaTheme } from '@/theme/theme';
import { AuditLogsPage } from '@/pages/AuditLogsPage';

const authState = vi.hoisted(() => ({
  permissions: ['audit.view'] as string[],
  accessLoaded: true,
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Auditor' },
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
    selectedProjectId: null,
    selectedProject: null,
    projects: [],
    setSelectedProjectId: vi.fn(),
    isLoading: false,
    isReady: true,
    error: null,
    hasNoProjectAccess: false,
    needsProjectSelection: false,
    selectionIssue: null,
    globalAccess: false,
    access: { globalAccess: false, projectIds: [] },
    allProjects: [],
    refetch: vi.fn(),
  }),
}));

const listAuditLogs = vi.fn();

vi.mock('@/api/audit-logs', () => ({
  listAuditLogs: (...args: unknown[]) => listAuditLogs(...args),
  listEntityAuditLogs: vi.fn(),
  getAuditLog: vi.fn(),
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const ui: ReactElement = (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={luxariaTheme}>
        <CssBaseline />
        <MemoryRouter>
          <AuditLogsPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return render(ui);
}

describe('AuditLogsPage', () => {
  beforeEach(() => {
    authState.permissions = ['audit.view'];
    authState.accessLoaded = true;
    listAuditLogs.mockReset();
    listAuditLogs.mockResolvedValue({
      items: [
        {
          id: 'log1',
          userId: '507f1f77bcf86cd799439012',
          action: 'UPDATE',
          module: 'investors',
          entityType: 'investor',
          entityId: 'e1',
          projectId: null,
          beforeData: { name: 'Old', password: '********' },
          afterData: { name: 'New', password: '********' },
          requestId: 'req-abc',
          timestamp: '2026-07-01T12:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  });

  it('denies access without audit.view', () => {
    authState.permissions = ['document.view'];
    renderPage();
    expect(screen.getByText('Audit logs unavailable')).toBeInTheDocument();
    expect(listAuditLogs).not.toHaveBeenCalled();
  });

  it('lists logs with request id (read-only viewer)', async () => {
    renderPage();

    await waitFor(() => {
      expect(listAuditLogs).toHaveBeenCalled();
    });

    expect(await screen.findByText('req-abc')).toBeInTheDocument();
    expect(
      screen.getByText(/no create, update, or delete actions/i),
    ).toBeInTheDocument();
  });

  it('applies actor filter to Nest query', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(listAuditLogs).toHaveBeenCalled());

    const actor = screen.getByLabelText(/Actor \(user id\)/i);
    await user.clear(actor);
    await user.type(actor, '507f1f77bcf86cd799439012');

    await waitFor(() => {
      const last = listAuditLogs.mock.calls.at(-1)?.[0] as {
        userId?: string;
      };
      expect(last?.userId).toBe('507f1f77bcf86cd799439012');
    });
  });
});
