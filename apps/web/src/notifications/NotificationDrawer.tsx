import { Link as RouterLink } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { RetryPanel } from '@/components/errors';
import { NotificationList } from './NotificationList';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
  useUnreadNotificationCount,
} from './useNotifications';

const DRAWER_WIDTH = 380;

export function NotificationBell() {
  const { hasPermission, access } = useAuth();
  const canView = !access || hasPermission('notification.view');
  const [open, setOpen] = useState(false);

  const unreadQuery = useUnreadNotificationCount(canView);
  const listQuery = useNotificationsList(
    { page: 1, limit: 10 },
    canView && open,
  );
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  if (!canView) {
    return null;
  }

  const unread = unreadQuery.data ?? 0;

  return (
    <>
      <IconButton
        aria-label="Open notifications"
        onClick={() => setOpen(true)}
        size="small"
      >
        <Badge
          color="error"
          badgeContent={unread > 99 ? '99+' : unread}
          invisible={unread === 0}
        >
          <NotificationsNoneOutlinedIcon />
        </Badge>
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: DRAWER_WIDTH },
              maxWidth: '100%',
            },
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              mb: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6">Notifications</Typography>
            <Button size="small" onClick={() => setOpen(false)}>
              Close
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={markAll.isPending || unread === 0}
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </Button>
            <Button
              size="small"
              component={RouterLink}
              to="/notifications"
              onClick={() => setOpen(false)}
            >
              View all
            </Button>
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {listQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : listQuery.error ? (
              <RetryPanel
                error={listQuery.error}
                onRetry={() => void listQuery.refetch()}
              />
            ) : (
              <NotificationList
                items={listQuery.data?.items ?? []}
                dense
                markingId={markRead.isPending ? markRead.variables : null}
                onMarkRead={(id) => markRead.mutate(id)}
                onNavigate={() => setOpen(false)}
                emptyTitle="No notifications"
                emptyDescription="In-app alerts will appear here."
              />
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
