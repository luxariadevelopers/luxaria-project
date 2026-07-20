import { NavLink } from 'react-router-dom';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAuth } from '@/auth/AuthContext';
import { getVisibleNavGroups } from '@/navigation/filterNav';

export const DRAWER_WIDTH = 260;
export const DRAWER_WIDTH_COLLAPSED = 72;

type Props = {
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
}: Props) {
  const { access } = useAuth();
  const groups = getVisibleNavGroups({
    accessLoaded: Boolean(access),
    bypassPermissions: Boolean(access?.bypassPermissions),
    permissions: access?.permissions ?? [],
  });
  const width = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed ? (
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Menu
          </Typography>
        ) : null}
        <IconButton
          size="small"
          onClick={onToggleCollapsed}
          sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: 'auto', flex: 1 }}>
        {groups.map((group) => (
          <Box key={group.id} sx={{ px: 1, py: 1 }}>
            {!collapsed ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 1.5, textTransform: 'uppercase' }}
              >
                {group.label}
              </Typography>
            ) : null}
            <List dense disablePadding>
              {group.items.map((item) => (
                <ListItemButton
                  key={item.id}
                  component={NavLink}
                  to={item.to}
                  onClick={onClose}
                  sx={{ borderRadius: 1, mb: 0.25 }}
                >
                  <ListItemText
                    primary={collapsed ? item.label.slice(0, 1) : item.label}
                    slotProps={{
                      primary: { noWrap: true, variant: 'body2' },
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: width }, flexShrink: { md: 0 } }}
      aria-label="Main"
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {content}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {content}
      </Drawer>
    </Box>
  );
}
