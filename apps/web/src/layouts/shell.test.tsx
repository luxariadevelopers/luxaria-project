import type { ReactElement } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
    refreshUser: vi.fn().mockResolvedValue(undefined),
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
    sessionStorage.clear();
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
    expect(within(nav).getByText('Projects')).toBeInTheDocument();
    expect(within(nav).getByText('Admin')).toBeInTheDocument();
    expect(within(nav).queryByText('Users')).not.toBeInTheDocument();
    expect(within(nav).queryByText('Accounting')).not.toBeInTheDocument();

    fireEvent.click(within(nav).getByText('Projects'));
    expect(within(nav).getByText('Project control')).toBeInTheDocument();
    fireEvent.click(within(nav).getByText('Project control'));
    expect(within(nav).getByText('Daily progress')).toBeInTheDocument();
  });

  it('filters nav items with search-in-nav', () => {
    renderWithProviders(
      <Sidebar
        mobileOpen={false}
        onClose={() => undefined}
        collapsed={false}
        onToggleCollapsed={() => undefined}
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Main' });
    fireEvent.change(within(nav).getByLabelText('Search navigation'), {
      target: { value: 'daily' },
    });
    expect(within(nav).getByText('Daily progress')).toBeInTheDocument();
    expect(within(nav).queryByText('Admin')).not.toBeInTheDocument();
  });

  it('shows pillar icons only when sidebar is collapsed', () => {
    renderWithProviders(
      <Sidebar
        mobileOpen={false}
        onClose={() => undefined}
        collapsed
        onToggleCollapsed={() => undefined}
      />,
    );

    // Collapsed rail: pillar icon buttons + expand control.
    expect(
      screen.getByRole('button', { name: 'Projects' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Expand sidebar' }),
    ).toBeInTheDocument();
    // Leaf links stay in the flyout (closed), not on the rail.
    expect(
      screen.queryByRole('link', { name: 'Daily progress' }),
    ).not.toBeInTheDocument();
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

  it('shows page title for nested registry routes', () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/procurement/purchase-orders"
          element={<PageHeader />}
        />
      </Routes>,
      '/procurement/purchase-orders',
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Purchase Orders' }),
    ).toBeInTheDocument();
    const crumbs = screen.getByLabelText('breadcrumb');
    expect(within(crumbs).getByText('Purchase Orders')).toBeInTheDocument();
    // Parent uses ROUTE_LABELS — never the raw URL segment.
    expect(within(crumbs).getByText('Procurement')).toBeInTheDocument();
    expect(within(crumbs).queryByText('procurement')).not.toBeInTheDocument();
    expect(within(crumbs).queryByText('purchase-orders')).not.toBeInTheDocument();
  });

  it('opens profile menu with user identity and settings link', () => {
    renderWithProviders(<ProfileMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
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

  it('records frequent routes in sessionStorage', () => {
    shellStorage.recordFrequentRoute({
      to: '/dpr',
      label: 'Daily progress',
      icon: 'dpr',
    });
    shellStorage.recordFrequentRoute({
      to: '/projects',
      label: 'Projects',
      icon: 'projects',
    });
    shellStorage.recordFrequentRoute({
      to: '/dpr',
      label: 'Daily progress',
      icon: 'dpr',
    });
    const frequent = shellStorage.getFrequentRoutes();
    expect(frequent).toHaveLength(2);
    expect(frequent[0]?.to).toBe('/dpr');
    expect(frequent[1]?.to).toBe('/projects');
  });
});
