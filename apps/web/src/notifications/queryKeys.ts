import type { ListNotificationsQuery } from './types';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

export const notificationsListQueryKey = (query: ListNotificationsQuery) =>
  [...NOTIFICATIONS_QUERY_KEY, 'list', query] as const;

export const notificationsUnreadCountQueryKey = [
  ...NOTIFICATIONS_QUERY_KEY,
  'unread-count',
] as const;
