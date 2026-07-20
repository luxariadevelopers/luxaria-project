import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';

function initials(name: string | undefined): string {
  if (!name?.trim()) {
    return 'U';
  }
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase() || 'U';
}

export function ProfileMenu() {
  const { user, access, logout, hasPermission } = useAuth();
  const { success, error } = useNotify();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const canViewNotifications =
    !access || hasPermission('notification.view');
  const canViewApprovals = !access || hasPermission('approval.view');

  const open = Boolean(anchorEl);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      success('Signed out');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
      setAnchorEl(null);
    }
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="small"
        aria-label="Open profile menu"
        aria-controls={open ? 'profile-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{ ml: 0.5 }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {initials(user?.fullName)}
        </Avatar>
      </IconButton>
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: { minWidth: 240, mt: 1 },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {user?.fullName ?? 'User'}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: 'block' }}
          >
            {user?.email ?? user?.userCode ?? '—'}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: 'block' }}
            noWrap
          >
            {access?.roleCodes?.length
              ? access.roleCodes.join(', ')
              : 'No roles loaded'}
          </Typography>
        </Box>
        <Divider />
        {canViewApprovals ? (
          <MenuItem
            component={RouterLink}
            to="/approvals"
            onClick={() => setAnchorEl(null)}
          >
            <ListItemIcon>
              <FactCheckOutlinedIcon fontSize="small" />
            </ListItemIcon>
            Pending approvals
          </MenuItem>
        ) : null}
        {canViewNotifications ? (
          <MenuItem
            component={RouterLink}
            to="/notifications"
            onClick={() => setAnchorEl(null)}
          >
            <ListItemIcon>
              <NotificationsNoneOutlinedIcon fontSize="small" />
            </ListItemIcon>
            Notifications
          </MenuItem>
        ) : null}
        <MenuItem
          component={RouterLink}
          to="/settings"
          onClick={() => setAnchorEl(null)}
        >
          <ListItemIcon>
            <PersonOutlineOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem
          component={RouterLink}
          to="/settings"
          onClick={() => setAnchorEl(null)}
        >
          <ListItemIcon>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setConfirmOpen(true);
          }}
        >
          <ListItemIcon>
            <LogoutOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        description="You will need to sign in again to continue."
        confirmLabel="Sign out"
        loading={loggingOut}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
