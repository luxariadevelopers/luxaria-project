import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { formatDateTime } from '@/format';
import { getEventTypeLabel } from './eventTypes';
import { resolveNotificationEntityLink } from './entityLinks';
import { NotificationSeverityBadge } from './NotificationSeverityBadge';
import type { PublicNotification } from './types';

type Props = {
  notification: PublicNotification;
  onMarkRead?: (id: string) => void;
  markingRead?: boolean;
  dense?: boolean;
  onNavigate?: () => void;
};

export function NotificationCard({
  notification,
  onMarkRead,
  markingRead = false,
  dense = false,
  onNavigate,
}: Props) {
  const { hasAnyPermission } = useAuth();
  const { setSelectedProjectId } = useProject();

  const link = resolveNotificationEntityLink(notification, {
    hasAnyPermission,
  });

  const handleOpenLink = () => {
    if (!link) {
      return;
    }
    if (
      link.requiresProject &&
      link.projectId &&
      link.projectId !== null
    ) {
      setSelectedProjectId(link.projectId);
    }
    onNavigate?.();
  };

  return (
    <Box
      sx={{
        p: dense ? 1.5 : 2,
        border: '1px solid',
        borderColor: notification.isRead ? 'divider' : 'primary.light',
        bgcolor: notification.isRead ? 'background.paper' : 'action.hover',
        borderRadius: 1,
      }}
    >
      <Stack spacing={1}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <NotificationSeverityBadge eventType={notification.eventType} />
          <Chip
            size="small"
            variant="outlined"
            label={getEventTypeLabel(notification.eventType)}
          />
          {!notification.isRead ? (
            <Chip size="small" color="primary" label="Unread" />
          ) : null}
        </Stack>

        <Typography
          variant={dense ? 'subtitle2' : 'subtitle1'}
          sx={{ fontWeight: notification.isRead ? 500 : 700 }}
        >
          {notification.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {notification.body}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {notification.createdAt
            ? formatDateTime(notification.createdAt)
            : '—'}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          {link ? (
            <Button
              component={RouterLink}
              to={link.to}
              size="small"
              variant="outlined"
              onClick={handleOpenLink}
            >
              {link.label}
            </Button>
          ) : null}
          {!notification.isRead && onMarkRead ? (
            <Button
              size="small"
              onClick={() => onMarkRead(notification.id)}
              disabled={markingRead}
            >
              Mark read
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
