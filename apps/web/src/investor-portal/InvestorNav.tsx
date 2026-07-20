import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { InvestorProjectSelector } from './InvestorProjectSelector';
import {
  INVESTOR_DASHBOARD_PATH,
  INVESTOR_DOCUMENTS_PATH,
  INVESTOR_PROJECTS_PATH,
  INVESTOR_STATEMENTS_PATH,
} from './paths';
import { useInvestorPortal } from './InvestorPortalContext';

export const INVESTOR_DRAWER_WIDTH = 240;

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
};

const INVESTOR_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: INVESTOR_DASHBOARD_PATH,
    icon: <DashboardOutlinedIcon />,
  },
  {
    label: 'Projects',
    to: INVESTOR_PROJECTS_PATH,
    icon: <FolderOutlinedIcon />,
  },
  {
    label: 'Documents',
    to: INVESTOR_DOCUMENTS_PATH,
    icon: <DescriptionOutlinedIcon />,
  },
  {
    label: 'Statements',
    to: INVESTOR_STATEMENTS_PATH,
    icon: <ReceiptLongOutlinedIcon />,
  },
];

/** Exported for isolation tests — must never include internal ERP routes. */
export const INVESTOR_NAV_PATHS = INVESTOR_NAV_ITEMS.map((item) => item.to);

type InvestorNavProps = {
  mobileOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export function InvestorNav({ mobileOpen, onClose, onLogout }: InvestorNavProps) {
  const { user } = useAuth();
  const { profile } = useInvestorPortal();

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
            Investor Portal
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {profile?.legalName ?? user?.fullName ?? 'Investor'}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flex: 1 }} data-testid="investor-nav">
        {INVESTOR_NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
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
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutOutlinedIcon />}
          onClick={onLogout}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: INVESTOR_DRAWER_WIDTH }, flexShrink: { md: 0 } }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: INVESTOR_DRAWER_WIDTH,
            boxSizing: 'border-box',
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
            width: INVESTOR_DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {content}
      </Drawer>
    </Box>
  );
}

export function InvestorHeader({
  onMenuClick,
  onLogout,
}: {
  onMenuClick: () => void;
  onLogout: () => void;
}) {
  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        width: { md: `calc(100% - ${INVESTOR_DRAWER_WIDTH}px)` },
        ml: { md: `${INVESTOR_DRAWER_WIDTH}px` },
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <Button
          variant="text"
          onClick={onMenuClick}
          sx={{ display: { md: 'none' } }}
        >
          Menu
        </Button>
        <Stack
          direction="row"
          spacing={2}
          sx={{ flex: 1, alignItems: 'center' }}
        >
          <Typography variant="h6" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Luxaria Investor Portal
          </Typography>
          <Box sx={{ flex: 1 }} />
          <InvestorProjectSelector />
          <Button
            variant="outlined"
            size="small"
            startIcon={<LogoutOutlinedIcon />}
            onClick={onLogout}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Sign out
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
