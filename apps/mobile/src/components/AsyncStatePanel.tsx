import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';
import { Button } from './Button';

type Props = {
  loading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  forbidden?: boolean;
  empty?: boolean;
  emptyLabel?: string;
  onRetry?: () => void;
};

export function AsyncStatePanel({
  loading,
  loadingLabel = 'Loading…',
  error,
  forbidden,
  empty,
  emptyLabel = 'Nothing here yet',
  onRetry,
}: Props) {
  if (loading) {
    return (
      <View style={styles.panel}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.text}>{loadingLabel}</Text>
      </View>
    );
  }

  if (forbidden) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Access denied</Text>
        <Text style={styles.text}>
          {error || 'Access denied. Contact MD'}
        </Text>
        {onRetry ? (
          <Button label="Retry" onPress={onRetry} style={styles.retry} />
        ) : null}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.text}>{error}</Text>
        {onRetry ? (
          <Button label="Retry" onPress={onRetry} style={styles.retry} />
        ) : null}
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.panel}>
        <Text style={styles.text}>{emptyLabel}</Text>
        {onRetry ? (
          <Button
            label="Retry"
            variant="secondary"
            onPress={onRetry}
            style={styles.retry}
          />
        ) : null}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  title: {
    ...typography.bodyStrong,
  },
  text: {
    ...typography.meta,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    alignSelf: 'center',
    minWidth: 120,
    marginTop: spacing.xs,
  },
});
