import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { colors } from '@/theme/colors';

export function LoadingPanel({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.panel}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[styles.panel, styles.dashed]}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ForbiddenPanel({
  message = 'You do not have permission for work measurements.',
}: {
  message?: string;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Access denied</Text>
      <Text style={styles.muted}>{message}</Text>
      <Text style={styles.hint}>Required: measurement.view or measurement.create</Text>
    </View>
  );
}

export function ErrorPanel({
  error,
  onRetry,
  retryLabel = 'Try again',
}: {
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  if (isForbiddenError(error)) {
    return (
      <ForbiddenPanel message={getErrorMessage(error, 'Access denied')} />
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.danger}>
        {getErrorMessage(error, 'Could not load work measurements')}
      </Text>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  dashed: {
    borderStyle: 'dashed',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  danger: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#F4F0E6',
    fontWeight: '700',
  },
});
