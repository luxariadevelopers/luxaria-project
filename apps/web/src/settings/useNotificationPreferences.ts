import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NOTIFICATIONS_QUERY_KEY } from '@/notifications/queryKeys';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from './api';
import { notificationPreferencesQueryKey } from './queryKeys';
import type { NotificationEventPreference } from './types';

export function useNotificationPreferences(enabled = true) {
  return useQuery({
    queryKey: notificationPreferencesQueryKey,
    queryFn: async () => {
      const res = await fetchNotificationPreferences();
      return res.data ?? null;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      muted?: boolean;
      events?: NotificationEventPreference[];
    }) => updateNotificationPreferences(body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationPreferencesQueryKey,
        }),
        queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
      ]);
    },
  });
}
