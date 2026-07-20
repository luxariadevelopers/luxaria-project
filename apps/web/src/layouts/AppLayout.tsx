import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Toolbar } from '@mui/material';
import { ProjectProvider } from '@/context/ProjectContext';
import { Header } from './Header';
import {
  DRAWER_WIDTH,
  DRAWER_WIDTH_COLLAPSED,
  Sidebar,
} from './Sidebar';
import { shellStorage } from './shellStorage';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    shellStorage.getSidebarCollapsed(),
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      shellStorage.setSidebarCollapsed(next);
      return next;
    });
  }, []);

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  return (
    <ProjectProvider>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          bgcolor: 'background.default',
          overflowX: 'hidden',
        }}
      >
        <Header
          onMenuClick={() => setMobileOpen((v) => !v)}
          sidebarCollapsed={collapsed}
        />
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${drawerWidth}px)` },
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          <Toolbar />
          <Container
            maxWidth="xl"
            sx={{
              py: { xs: 2, sm: 3 },
              px: { xs: 2, sm: 3 },
              minWidth: 0,
            }}
          >
            <Outlet />
          </Container>
        </Box>
      </Box>
    </ProjectProvider>
  );
}
