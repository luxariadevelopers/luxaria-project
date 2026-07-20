import { Navigate, Outlet } from 'react-router-dom';
import { ProjectRequiredRoute } from '@/auth/ProjectRequiredRoute';
import { canEnterRoute } from '@/navigation/routeAccess';
import {
  requireRouteById,
  type AppRouteId,
} from '@/navigation/routeRegistry';
import { useAuth } from './AuthContext';

type RegistryRouteGuardProps = {
  routeId: AppRouteId;
  redirectTo?: string;
};

/**
 * Route guard driven by the central navigation registry.
 * Uses the same permission evaluation as the sidebar (`evaluateRouteAccess`).
 * Project-scoped routes also require a valid active project.
 */
export function RegistryRouteGuard({
  routeId,
  redirectTo = '/forbidden',
}: RegistryRouteGuardProps) {
  const { access } = useAuth();
  const route = requireRouteById(routeId);

  const allowed = canEnterRoute(route, {
    accessLoaded: Boolean(access),
    bypassPermissions: Boolean(access?.bypassPermissions),
    permissions: access?.permissions ?? [],
  });

  if (!allowed) {
    return <Navigate to={redirectTo} replace />;
  }

  if (route.projectScope === 'required') {
    return <ProjectRequiredRoute />;
  }

  return <Outlet />;
}
