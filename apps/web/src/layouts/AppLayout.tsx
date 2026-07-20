import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Toolbar } from '@mui/material';
import { ProjectProvider } from '@/context/ProjectContext';
import { AppBreadcrumbs } from './AppBreadcrumbs';
import { Header } from './Header';
import { DRAWER_WIDTH, Sidebar } from './Sidebar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProjectProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Header onMenuClick={() => setMobileOpen((v) => !v)} />
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            minWidth: 0,
          }}
        >
          <Toolbar />
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <AppBreadcrumbs />
            <Outlet />
          </Container>
        </Box>
      </Box>
    </ProjectProvider>
  );
}
