import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserAccess } from '@/api/types';
import { InternalAppGuard } from './InvestorPortalGuard';
import { INVESTOR_NAV_PATHS } from './InvestorNav';

const investorAccess: UserAccess = {
  userId: 'inv-1',
  roleIds: ['role-investor'],
  roleCodes: ['INVESTOR'],
  permissions: ['investor.view', 'investor_portal.view', 'notification.view'],
  bypassPermissions: false,
};

const staffAccess: UserAccess = {
  userId: 'staff-1',
  roleIds: ['role-pm'],
  roleCodes: ['PROJECT_MANAGER'],
  permissions: ['project.view', 'dashboard.view', 'user.view'],
  bypassPermissions: false,
};

vi.mock('@/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/auth/AuthContext';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderInternalRoute(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<InternalAppGuard />}>
          <Route path="/dashboard" element={<div>Internal dashboard</div>} />
          <Route path="/users" element={<div>Internal users</div>} />
        </Route>
        <Route path="/investor/dashboard" element={<div>Investor dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('internal route isolation', () => {
  it('redirects investor-only sessions away from internal dashboard', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isBootstrapping: false,
      access: investorAccess,
    } as ReturnType<typeof useAuth>);

    renderInternalRoute('/dashboard');

    await waitFor(() => {
      expect(screen.getByText('Investor dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Internal dashboard')).not.toBeInTheDocument();
  });

  it('redirects investor-only sessions away from /users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isBootstrapping: false,
      access: investorAccess,
    } as ReturnType<typeof useAuth>);

    renderInternalRoute('/users');

    await waitFor(() => {
      expect(screen.getByText('Investor dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Internal users')).not.toBeInTheDocument();
  });

  it('allows staff sessions to reach internal routes', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isBootstrapping: false,
      access: staffAccess,
    } as ReturnType<typeof useAuth>);

    renderInternalRoute('/users');

    await waitFor(() => {
      expect(screen.getByText('Internal users')).toBeInTheDocument();
    });
  });
});

describe('investor nav isolation', () => {
  it('never exposes internal ERP paths in investor navigation', () => {
    for (const path of INVESTOR_NAV_PATHS) {
      expect(path.startsWith('/investor/')).toBe(true);
    }
    expect(INVESTOR_NAV_PATHS).not.toContain('/');
    expect(INVESTOR_NAV_PATHS).not.toContain('/users');
    expect(INVESTOR_NAV_PATHS).not.toContain('/projects');
  });
});
