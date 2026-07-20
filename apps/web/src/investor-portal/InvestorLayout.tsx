import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, Container, Toolbar } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { investorProjectStorage } from './investorProjectStorage';
import { InvestorPortalProvider } from './InvestorPortalContext';
import { INVESTOR_DRAWER_WIDTH, InvestorHeader, InvestorNav } from './InvestorNav';

export function InvestorLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    investorProjectStorage.clearSelectedProjectId();
    await logout();
    navigate('/investor/login', { replace: true });
  };

  return (
    <InvestorPortalProvider>
      <Box
        sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}
        data-testid="investor-layout"
      >
        <InvestorHeader
          onMenuClick={() => setMobileOpen((value) => !value)}
          onLogout={() => {
            void handleLogout();
          }}
        />
        <InvestorNav
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onLogout={() => {
            void handleLogout();
          }}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${INVESTOR_DRAWER_WIDTH}px)` },
            minWidth: 0,
          }}
        >
          <Toolbar />
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </InvestorPortalProvider>
  );
}
