import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet } from 'react-router-dom';
import {
  canEnterRoute,
  evaluateRouteAccess,
} from '@/navigation/routeAccess';
import type { PermissionCode } from '@/navigation/permissionCatalog';
import {
  getRouteById,
  type AppRouteId,
} from '@/navigation/routeRegistry';
import { useAuth } from './AuthContext';

type PermissionGuardProps = {
  /** Preferred: load anyOf/allOf from the navigation registry. */
  routeId?: AppRouteId;
  /** Legacy / ad-hoc overrides when routeId is not used. */
  anyOf?: readonly PermissionCode[];
  allOf?: readonly PermissionCode[];
  redirectTo?: string;
};

/**
 * Blocks direct URL access when permissions are missing.
 * Prefer `RegistryRouteGuard` + `routeId` so nav and guards share one source.
 */
export function PermissionGuard({
  routeId,
  anyOf,
  allOf,
  redirectTo = '/forbidden',
}: PermissionGuardProps) {
  const { access } = useAuth();
  const registered = routeId ? getRouteById(routeId) : undefined;

  const route = {
    anyOf: registered?.anyOf ?? anyOf,
    allOf: registered?.allOf ?? allOf,
  };

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
        data-testid="permission-guard-pending"
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!canEnterRoute(route, ctx)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
