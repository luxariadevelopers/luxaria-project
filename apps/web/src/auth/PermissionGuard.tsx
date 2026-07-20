import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

type PermissionGuardProps = {
  anyOf?: string[];
  allOf?: string[];
  redirectTo?: string;
};

export function PermissionGuard({
  anyOf,
  allOf,
  redirectTo = '/forbidden',
}: PermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions, access } = useAuth();

  // While permissions are still loading, allow render (sidebar will show)
  if (!access) {
    return <Outlet />;
  }

  if (allOf?.length && !hasAllPermissions(allOf)) {
    return <Navigate to={redirectTo} replace />;
  }
  if (anyOf?.length && !hasAnyPermission(anyOf)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
