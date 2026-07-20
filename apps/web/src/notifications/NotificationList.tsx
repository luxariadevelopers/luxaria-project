import { Stack } from '@mui/material';
import { EmptyState } from '@/components/errors';
import { NotificationCard } from './NotificationCard';
import type { PublicNotification } from './types';

type Props = {
  items: PublicNotification[];
  dense?: boolean;
  markingId?: string | null;
  onMarkRead?: (id: string) => void;
  onNavigate?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function NotificationList({
  items,
  dense,
  markingId,
  onMarkRead,
  onNavigate,
  emptyTitle = 'No notifications',
  emptyDescription = 'You are all caught up.',
}: Props) {
  if (items.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <Stack spacing={1.5}>
      {items.map((item) => (
        <NotificationCard
          key={item.id}
          notification={item}
          dense={dense}
          onMarkRead={onMarkRead}
          markingRead={markingId === item.id}
          onNavigate={onNavigate}
        />
      ))}
    </Stack>
  );
}
