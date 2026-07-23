import { useState } from 'react';
import { PageHeader } from '@/layouts/PageHeader';
import {
  Box,
  Button,
  CircularProgress,
  Pagination,
  Stack,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  NotificationFilters,
  type NotificationFilterState,
} from '@/notifications/NotificationFilters';
import { NotificationList } from '@/notifications/NotificationList';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
  useUnreadNotificationCount,
} from '@/notifications/useNotifications';
import type { ListNotificationsQuery } from '@/notifications/types';

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const { hasPermission, access } = useAuth();
  const [filters, setFilters] = useState<NotificationFilterState>({
    unreadOnly: false,
    eventType: '',
  });
  const [page, setPage] = useState(1);

  const canView = Boolean(access) && hasPermission('notification.view');

  const query: ListNotificationsQuery = {
    page,
    limit: PAGE_SIZE,
    unreadOnly: filters.unreadOnly || undefined,
    eventType: filters.eventType || undefined,
  };

  const listQuery = useNotificationsList(query, canView);
  const unreadQuery = useUnreadNotificationCount(canView);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Notifications unavailable"
        message="You need the notification.view permission to open the notification centre."
      />
    );
  }

  const totalPages = listQuery.data?.meta?.totalPages ?? 1;
  const unread = unreadQuery.data ?? 0;

  return (
    <Stack spacing={2}>
      <PageHeader
        subtitle={
          unread > 0
            ? `${unread} unread notification${unread === 1 ? '' : 's'}`
            : 'No unread notifications'
        }
        actions={
          <Button
            variant="outlined"
            disabled={markAll.isPending || unread === 0}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        }
      />

      <NotificationFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      {listQuery.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : listQuery.error ? (
        <RetryPanel
          error={listQuery.error}
          onRetry={() => void listQuery.refetch()}
          forceRetry
        />
      ) : (listQuery.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title={filters.unreadOnly ? 'No unread notifications' : 'No notifications'}
          description="Try clearing filters, or check back after new alerts arrive."
        />
      ) : (
        <>
          <NotificationList
            items={listQuery.data?.items ?? []}
            markingId={markRead.isPending ? markRead.variables : null}
            onMarkRead={(id) => markRead.mutate(id)}
          />
          {totalPages > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
              <Pagination
                page={page}
                count={totalPages}
                color="primary"
                onChange={(_e, next) => setPage(next)}
              />
            </Box>
          ) : null}
        </>
      )}
    </Stack>
  );
}
