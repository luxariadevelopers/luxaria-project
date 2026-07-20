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
import { ApprovalsBadge } from '@/approvals/ApprovalsBadge';
import { NotificationBell } from '@/notifications';
import { useQuickSearchPalette } from '@/quick-search';
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED } from './Sidebar';
import { ProfileMenu } from './ProfileMenu';
import { ProjectBadge } from './ProjectBadge';
import { ProjectSelector } from './ProjectSelector';

type HeaderProps = {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
};

function searchShortcutLabel(): string {
  if (
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform)
  ) {
    return '⌘K';
  }
  return 'Ctrl+K';
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const drawerWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;
  const { openSearch } = useQuickSearchPalette();
  const shortcut = searchShortcutLabel();

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: (theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Toolbar
        sx={{
          gap: { xs: 1, sm: 2 },
          minHeight: { xs: 56, sm: 64 },
          px: { xs: 1.5, sm: 2 },
        }}
      >
        <IconButton
          edge="start"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          variant="subtitle1"
          sx={{
            display: { xs: 'none', sm: 'block' },
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Luxaria ERP
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.75, sm: 1.5 },
            minWidth: 0,
            maxWidth: { xs: '58%', sm: 'none' },
          }}
        >
          <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
            <ProjectBadge />
          </Box>
          <Box
            sx={{
              minWidth: 0,
              maxWidth: { xs: 160, sm: 220, md: 260 },
              '& .MuiFormControl-root': { minWidth: { xs: 140, sm: 180 } },
            }}
          >
            <ProjectSelector />
          </Box>
          <Tooltip title={`Quick search (${shortcut})`}>
            <IconButton
              onClick={openSearch}
              aria-label={`Open quick search (${shortcut})`}
              size="small"
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>
          <ApprovalsBadge />
          <NotificationBell />
          <ProfileMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
