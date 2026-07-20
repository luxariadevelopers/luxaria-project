import MenuIcon from '@mui/icons-material/Menu';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Button,
} from '@mui/material';
import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import { DRAWER_WIDTH } from './Sidebar';
import { ProjectSelector } from './ProjectSelector';

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { success, error } = useNotify();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
    }
  };

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}
          >
            Construction ERP
          </Typography>
          <Box sx={{ flex: 1 }} />
          <ProjectSelector />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            {user?.fullName}
          </Typography>
          <Button
            size="small"
            startIcon={<LogoutOutlinedIcon />}
            onClick={() => setConfirmOpen(true)}
          >
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
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
