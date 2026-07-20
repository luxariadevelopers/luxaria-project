import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './api';
import {
  NOTIFICATIONS_QUERY_KEY,
  notificationsListQueryKey,
  notificationsUnreadCountQueryKey,
} from './queryKeys';
import type { ListNotificationsQuery } from './types';

export function useNotificationsList(
  query: ListNotificationsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: notificationsListQueryKey(query),
    queryFn: () => fetchNotifications(query),
    enabled,
    staleTime: 15_000,
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: notificationsUnreadCountQueryKey,
    queryFn: fetchUnreadNotificationCount,
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

function invalidateNotificationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}
