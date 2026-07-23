import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import { blurActiveElement } from '@/utils/blurActiveElement';
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED } from './Sidebar';
import { ProjectSelector } from './ProjectSelector';

type Props = {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
};

export function Header({ onMenuClick, sidebarCollapsed }: Props) {
  const drawerWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          edge="start"
          onClick={() => {
            blurActiveElement();
            onMenuClick();
          }}
          sx={{ display: { md: 'none' } }}
          aria-label="Open navigation"
        >
          <MenuIcon />
        </IconButton>
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1,
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          <Box
            component="img"
            src="/luxaria-logo-xs.png"
            alt="Luxaria Developers"
            sx={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 0.5 }}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
            Luxaria
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }} />
        <ProjectSelector />
      </Toolbar>
    </AppBar>
  );
}
