import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { luxariaTheme } from '@/theme/theme';
import { DocumentsPage } from '@/pages/DocumentsPage';

const authState = vi.hoisted(() => ({
  permissions: ['document.view'] as string[],
  accessLoaded: true,
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Doc User' },
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

const listEntityDocuments = vi.fn();

vi.mock('@/api/documents', () => ({
  listEntityDocuments: (...args: unknown[]) => listEntityDocuments(...args),
  archiveDocument: vi.fn(),
  getDocumentDownloadUrl: vi.fn(),
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
          <DocumentsPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return render(ui);
}

describe('DocumentsPage permission denial', () => {
  beforeEach(() => {
    authState.permissions = ['document.view'];
    authState.accessLoaded = true;
    listEntityDocuments.mockReset();
  });

  it('denies access without document.view', () => {
    authState.permissions = ['project.view'];
    renderPage();
    expect(screen.getByText('Documents unavailable')).toBeInTheDocument();
    expect(listEntityDocuments).not.toHaveBeenCalled();
  });

  it('does not call list API until entity filters are valid', () => {
    renderPage();
    expect(screen.getByText('Choose an entity')).toBeInTheDocument();
    expect(listEntityDocuments).not.toHaveBeenCalled();
  });
});
