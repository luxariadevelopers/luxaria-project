import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './AuthContext';
import {
  investorHomePath,
  investorLoginPath,
  isInvestorOnlySession,
} from '@/investor-portal/session';

type ProtectedRouteProps = {
  loginPath?: string;
};

export function ProtectedRoute({ loginPath = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isBootstrapping, access } = useAuth();
  const location = useLocation();

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
    const isInvestorPath = location.pathname.startsWith('/investor');
    const targetLogin = isInvestorPath ? investorLoginPath() : loginPath;
    return <Navigate to={targetLogin} replace state={{ from: location }} />;
  }

  if (
    loginPath === '/login' &&
    access &&
    isInvestorOnlySession(access) &&
    !location.pathname.startsWith('/investor')
  ) {
    return <Navigate to={investorHomePath()} replace />;
  }

  return <Outlet />;
}
