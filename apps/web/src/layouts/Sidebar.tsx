import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';

export const DRAWER_WIDTH = 260;

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
  permission?: string;
  group?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: <DashboardOutlinedIcon /> },
  {
    label: 'Users',
    to: '/users',
    icon: <GroupOutlinedIcon />,
    permission: 'user.view',
  },
  {
    label: 'Projects',
    to: '/projects',
    icon: <FolderOutlinedIcon />,
    permission: 'project.view',
  },
  {
    label: 'Daily Progress',
    to: '/daily-progress-reports',
    icon: <AssignmentOutlinedIcon />,
    permission: 'dpr.view',
  },
  {
    label: 'Collections',
    to: '/sales/collections',
    icon: <PaymentsOutlinedIcon />,
    permission: 'collection.view',
    group: 'Sales',
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: <SettingsOutlinedIcon />,
  },
];

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { hasPermission, access } = useAuth();

  const items = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    if (!access) return true;
    return hasPermission(item.permission);
  });

  const content = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2.5, gap: 1.5 }}>
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
          }}
        >
          L
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Luxaria
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Developers ERP
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {items.map((item, index) => {
          const prev = items[index - 1];
          const showGroup =
            Boolean(item.group) && item.group !== prev?.group;
          return (
            <Box key={item.to}>
              {showGroup ? (
                <ListSubheader
                  disableSticky
                  sx={{
                    bgcolor: 'transparent',
                    lineHeight: 2.2,
                    fontWeight: 700,
                    color: 'text.secondary',
                    px: 1,
                  }}
                >
                  {item.group}
                </ListSubheader>
              ) : null}
              <ListItemButton
                component={NavLink}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.active': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': { color: 'inherit' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </Box>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
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
        {content}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
        }}
      >
        {content}
      </Drawer>
    </Box>
  );
}
