import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

const INVESTOR_PORTAL_PERMISSION = 'investor_portal.view';

/**
 * Route guard for the isolated investor portal area.
 * Requires `investor_portal.view` — never staff investor permissions.
 */
export function InvestorPortalGuard() {
  const { hasPermission, access, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping || !access) {
    return <Outlet />;
  }

  if (!hasPermission(INVESTOR_PORTAL_PERMISSION)) {
    return (
      <Navigate
        to="/forbidden"
        replace
        state={{ from: location, reason: 'investor_portal.view required' }}
      />
    );
  }

  return <Outlet />;
}

export { INVESTOR_PORTAL_PERMISSION };
