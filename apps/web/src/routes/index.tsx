import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RegistryRouteGuard } from '@/auth/RegistryRouteGuard';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { toRelativeAppPath } from '@/navigation/routeRegistry';
import { CancellationsPage } from '@/pages/CancellationsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UsersPage } from '@/pages/UsersPage';

/**
 * Phase 106 worktree router — focused shell + cancellations route.
 * On `/apply-worktree`, merge the `cancellations` RegistryRouteGuard block
 * into the main app router (do not replace the full main registry routes).
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<RegistryRouteGuard routeId="dashboard" />}>
              <Route index element={<DashboardPage />} />
            </Route>

            <Route element={<RegistryRouteGuard routeId="users" />}>
              <Route path={toRelativeAppPath('/users')} element={<UsersPage />} />
            </Route>

            <Route element={<RegistryRouteGuard routeId="projects" />}>
              <Route
                path={toRelativeAppPath('/projects')}
                element={<ProjectsPage />}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="cancellations" />}>
              <Route
                path={toRelativeAppPath('/sales/cancellations')}
                element={<CancellationsPage />}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="settings" />}>
              <Route
                path={toRelativeAppPath('/settings')}
                element={<SettingsPage />}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="forbidden" />}>
              <Route
                path={toRelativeAppPath('/forbidden')}
                element={<ForbiddenPage />}
              />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
