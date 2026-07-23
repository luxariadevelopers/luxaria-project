import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '@/theme/colors';

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
          <Pressable style={styles.retry} onPress={onRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
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
          <Pressable style={styles.retry} onPress={onRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.panel}>
        <Text style={styles.text}>{emptyLabel}</Text>
        {onRetry ? (
          <Pressable style={styles.retry} onPress={onRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
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
    padding: 20,
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  text: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retry: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: '#F4F0E6',
    fontWeight: '700',
  },
});
