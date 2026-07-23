import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet } from 'react-router-dom';
import { ProjectRequiredRoute } from '@/auth/ProjectRequiredRoute';
import {
  canEnterRoute,
  evaluateRouteAccess,
} from '@/navigation/routeAccess';
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

  const ctx = {
    accessLoaded: Boolean(access),
    bypassPermissions: Boolean(access?.bypassPermissions),
    permissions: access?.permissions ?? [],
  };

  const decision = evaluateRouteAccess(route, ctx);

  if (decision === 'pending') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 240,
        }}
        data-testid="route-access-pending"
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!canEnterRoute(route, ctx)) {
    return <Navigate to={redirectTo} replace />;
  }

  if (route.projectScope === 'required') {
    return <ProjectRequiredRoute />;
  }

  return <Outlet />;
}
