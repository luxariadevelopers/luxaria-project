import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { blurActiveElement } from '@/utils/blurActiveElement';
import { NotificationBell } from '@/notifications';
import { useQuickSearchPalette } from '@/quick-search';
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED } from './Sidebar';
import { ProfileMenu } from './ProfileMenu';
import { ProjectSelector } from './ProjectSelector';

type Props = {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
};

export function Header({ onMenuClick, sidebarCollapsed }: Props) {
  const drawerWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;
  const { openSearch } = useQuickSearchPalette();

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
        transition: (theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Toolbar
        sx={{
          gap: { xs: 0.75, sm: 1.5 },
          minHeight: { xs: 56, sm: 64 },
          px: { xs: 1, sm: 2 },
        }}
      >
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
            gap: 0.75,
            minWidth: 0,
            flexShrink: 1,
          }}
        >
          <Box
            component="img"
            src="/luxaria-logo-xs.png"
            alt="Luxaria Developers"
            sx={{
              width: 28,
              height: 28,
              objectFit: 'contain',
              borderRadius: 0.5,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}
            noWrap
          >
            Luxaria
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 8 }} />
        <ProjectSelector />
        <Tooltip title="Quick search (⌘K)">
          <IconButton
            aria-label="Open quick search"
            onClick={openSearch}
            size="small"
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>
        <NotificationBell />
        <ProfileMenu />
      </Toolbar>
    </AppBar>
  );
}
