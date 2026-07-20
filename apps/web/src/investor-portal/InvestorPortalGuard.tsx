import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import {
  hasInvestorPortalAccess,
  investorHomePath,
  investorLoginPath,
  isInvestorOnlySession,
} from './session';

export function InvestorPortalGuard() {
  const { isAuthenticated, isBootstrapping, access } = useAuth();

  if (isBootstrapping) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={investorLoginPath()} replace />;
  }

  if (access && !hasInvestorPortalAccess(access)) {
    return <Navigate to="/investor/forbidden" replace />;
  }

  return <Outlet />;
}

export function InternalAppGuard() {
  const { isBootstrapping, access } = useAuth();

  if (isBootstrapping || !access) {
    return <Outlet />;
  }

  if (isInvestorOnlySession(access)) {
    return <Navigate to={investorHomePath()} replace />;
  }

  return <Outlet />;
}
