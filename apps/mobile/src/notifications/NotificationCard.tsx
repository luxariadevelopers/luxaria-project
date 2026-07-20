import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { InboxNotification } from '@/api/notifications';
import { colors } from '@/theme/colors';

type Props = {
  notification: InboxNotification;
  actionable: boolean;
  onPress: () => void;
};

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export function NotificationCard({
  notification,
  actionable,
  onPress,
}: Props) {
  const metaParts = [
    notification.eventType.split('_').join(' '),
    notification.entityType
      ? `${notification.entityType}${
          notification.entityId ? ` · ${notification.entityId.slice(-6)}` : ''
        }`
      : null,
    formatWhen(notification.createdAt),
  ].filter(Boolean);

  return (
    <Pressable
      style={[styles.card, !notification.isRead && styles.unread]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={
        actionable ? 'Opens related record when permitted' : undefined
      }
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {notification.title}
        </Text>
        {!notification.isRead ? (
          <View style={styles.dot} accessibilityLabel="Unread" />
        ) : null}
      </View>
      <Text style={styles.body} numberOfLines={3}>
        {notification.body}
      </Text>
      <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
      {actionable ? (
        <Text style={styles.cta}>Open</Text>
      ) : (
        <Text style={styles.ctaMuted}>No deep link</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  unread: {
    borderColor: colors.primary,
    backgroundColor: '#E8EEF1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginTop: 6,
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  cta: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  ctaMuted: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
});
