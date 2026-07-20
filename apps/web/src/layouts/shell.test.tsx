import type { ReactElement } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { luxariaTheme } from '@/theme/theme';
import { PageHeader } from './PageHeader';
import { Sidebar } from './Sidebar';
import { ProfileMenu } from './ProfileMenu';
import { shellStorage } from './shellStorage';

const authState = vi.hoisted(() => ({
  permissions: ['project.view', 'dpr.view'] as string[],
  bypass: false,
  accessLoaded: true,
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      fullName: 'Ada Lovelace',
      email: 'ada@luxaria.dev',
      userCode: 'ADA',
    },
    access: authState.accessLoaded
      ? {
          permissions: authState.permissions,
          roleCodes: ['SITE_ENGINEER'],
          bypassPermissions: authState.bypass,
        }
      : null,
    isAuthenticated: true,
    isBootstrapping: false,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    hasPermission: (p: string) =>
      authState.bypass || authState.permissions.includes(p),
    hasAnyPermission: (ps: string[]) =>
      authState.bypass || ps.some((p) => authState.permissions.includes(p)),
    hasAllPermissions: (ps: string[]) =>
      authState.bypass || ps.every((p) => authState.permissions.includes(p)),
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

function renderWithProviders(ui: ReactElement, path = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={luxariaTheme}>
        <CssBaseline />
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('responsive web shell', () => {
  beforeEach(() => {
    authState.permissions = ['project.view', 'dpr.view'];
    authState.bypass = false;
    authState.accessLoaded = true;
    localStorage.clear();
  });

  it('renders module groups and filters menu by permission', () => {
    renderWithProviders(
      <Sidebar
        mobileOpen={false}
        onClose={() => undefined}
        collapsed={false}
        onToggleCollapsed={() => undefined}
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByText('Overview')).toBeInTheDocument();
    expect(within(nav).getByText('Projects & site')).toBeInTheDocument();
    expect(within(nav).getByText('Projects')).toBeInTheDocument();
    expect(within(nav).getByText('Daily progress')).toBeInTheDocument();
    expect(within(nav).queryByText('Users')).not.toBeInTheDocument();
    expect(within(nav).getByText('Settings')).toBeInTheDocument();
  });

  it('hides group labels when sidebar is collapsed', () => {
    renderWithProviders(
      <Sidebar
        mobileOpen={false}
        onClose={() => undefined}
        collapsed
        onToggleCollapsed={() => undefined}
      />,
    );

    expect(screen.queryByText('Projects & site')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Expand sidebar' }),
    ).toBeInTheDocument();
  });

  it('shows page header title and breadcrumbs for a route', () => {
    renderWithProviders(
      <Routes>
        <Route path="/projects" element={<PageHeader />} />
      </Routes>,
      '/projects',
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Projects' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('breadcrumb')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('opens profile menu with user identity and settings link', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileMenu />);

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@luxaria.dev')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('persists sidebar collapsed preference', () => {
    expect(shellStorage.getSidebarCollapsed()).toBe(false);
    shellStorage.setSidebarCollapsed(true);
    expect(shellStorage.getSidebarCollapsed()).toBe(true);
  });
});
