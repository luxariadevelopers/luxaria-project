import { NavLink } from 'react-router-dom';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAuth } from '@/auth/AuthContext';
import { getVisibleNavGroups } from '@/navigation/filterNav';
import { navIcon } from './navIcons';

export const DRAWER_WIDTH = 260;
export const DRAWER_WIDTH_COLLAPSED = 76;

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Sidebar({
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const { access } = useAuth();

  const groups = getVisibleNavGroups({
    accessLoaded: Boolean(access),
    bypassPermissions: Boolean(access?.bypassPermissions),
    permissions: access?.permissions ?? [],
  });

  const desktopWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const brand = (
    <Toolbar
      sx={{
        px: collapsed ? 1 : 2,
        gap: 1.5,
        minHeight: 64,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          bgcolor: 'secondary.main',
          color: 'primary.main',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontFamily: 'Fraunces, serif',
          flexShrink: 0,
        }}
      >
        L
      </Box>
      {!collapsed ? (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, lineHeight: 1.2 }}
            noWrap
          >
            Luxaria
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Developers ERP
          </Typography>
        </Box>
      ) : null}
    </Toolbar>
  );

  const navList = (
    <List
      sx={{
        px: collapsed ? 0.75 : 1.5,
        py: 1.5,
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      dense
    >
      {groups.map((group) => (
        <Box key={group.id} sx={{ mb: 1.5 }}>
          {!collapsed ? (
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{
                display: 'block',
                px: 1.5,
                mb: 0.5,
                letterSpacing: 1,
                fontSize: 10,
              }}
            >
              {group.label}
            </Typography>
          ) : (
            <Divider sx={{ my: 1, mx: 1 }} />
          )}
          {group.items.map((item) => {
            const button = (
              <ListItemButton
                key={item.id}
                component={NavLink}
                to={item.to}
                end={item.end}
                onClick={onClose}
                sx={{
                  borderRadius: 2,
                  mb: 0.25,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1 : 2,
                  '&.active': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': { color: 'inherit' },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 40,
                    color: 'inherit',
                    justifyContent: 'center',
                  }}
                >
                  {navIcon(item.icon)}
                </ListItemIcon>
                {!collapsed ? <ListItemText primary={item.label} /> : null}
              </ListItemButton>
            );

            return collapsed ? (
              <Tooltip key={item.id} title={item.label} placement="right">
                {button}
              </Tooltip>
            ) : (
              button
            );
          })}
        </Box>
      ))}
    </List>
  );

  const collapseControl = (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        justifyContent: collapsed ? 'center' : 'flex-end',
        px: 1,
        py: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Tooltip title={collapsed ? 'Expand menu' : 'Collapse menu'}>
        <IconButton
          size="small"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );

  const content = (forMobile: boolean) => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {brand}
      <Divider />
      {navList}
      {!forMobile ? collapseControl : null}
    </Box>
  );

  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        width: { md: desktopWidth },
        flexShrink: { md: 0 },
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {content(true)}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: desktopWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflowX: 'hidden',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          },
        }}
      >
        {content(false)}
      </Drawer>
    </Box>
  );
}
