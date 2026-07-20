import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PermissionGuard } from '@/auth/PermissionGuard';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DprPage } from '@/pages/DprPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UsersPage } from '@/pages/UsersPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route element={<PermissionGuard anyOf={['user.view']} />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route element={<PermissionGuard anyOf={['project.view']} />}>
              <Route path="projects" element={<ProjectsPage />} />
            </Route>
            <Route element={<PermissionGuard anyOf={['dpr.view']} />}>
              <Route path="daily-progress-reports" element={<DprPage />} />
            </Route>
            <Route element={<PermissionGuard anyOf={['collection.view']} />}>
              <Route path="sales/collections" element={<CollectionsPage />} />
            </Route>
            <Route path="settings" element={<SettingsPage />} />
            <Route path="forbidden" element={<ForbiddenPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
