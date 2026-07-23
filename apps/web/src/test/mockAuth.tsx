import { type ReactNode } from 'react';
import { vi } from 'vitest';

const authState = {
  hasPermission: (permission: string) =>
    permission === 'project.update' || permission === 'project.view',
  hasAnyPermission: (permissions: string[]) =>
    permissions.some((p) => authState.hasPermission(p)),
  hasAllPermissions: (permissions: string[]) =>
    permissions.every((p) => authState.hasPermission(p)),
};

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Test' },
    access: {
      permissions: ['project.view', 'project.update'],
      bypassPermissions: false,
    },
    isAuthenticated: true,
    isBootstrapping: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    hasPermission: (p: string) => authState.hasPermission(p),
    hasAnyPermission: (ps: string[]) => authState.hasAnyPermission(ps),
    hasAllPermissions: (ps: string[]) => authState.hasAllPermissions(ps),
  }),
  getErrorMessage: (err: unknown, fallback = 'Error') =>
    err instanceof Error ? err.message : fallback,
}));

export function AllPermissions({ children }: { children: ReactNode }) {
  return children;
}
