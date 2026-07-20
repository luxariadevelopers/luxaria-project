import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
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
          onClick={onMenuClick}
          sx={{ display: { md: 'none' } }}
          aria-label="Open navigation"
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Luxaria Developers
        </Typography>
        <ProjectSelector />
      </Toolbar>
    </AppBar>
  );
}
