import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { InboxNotification } from '@/api/notifications';
import { colors, hitSlopMin, radii, spacing, typography } from '@/theme';

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
      style={({ pressed }) => [
        styles.card,
        !notification.isRead && styles.unread,
        pressed && styles.pressed,
      ]}
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
    minHeight: hitSlopMin,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg - 2,
    marginBottom: spacing.sm,
  },
  unread: {
    borderColor: colors.primary,
    backgroundColor: '#E8EEF1',
  },
  pressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm - 2,
  },
  title: {
    flex: 1,
    ...typography.bodyStrong,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginTop: spacing.sm - 2,
  },
  body: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  meta: {
    ...typography.meta,
    fontSize: 12,
    textTransform: 'capitalize',
    marginBottom: spacing.sm,
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
