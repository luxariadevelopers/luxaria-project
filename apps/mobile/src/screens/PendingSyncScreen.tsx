import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useOfflineSync } from '@/offline';
import { OfflineTxnStatus } from '@/offline/types';
import { colors } from '@/theme/colors';

function statusColor(status: string) {
  switch (status) {
    case OfflineTxnStatus.Synced:
      return colors.success;
    case OfflineTxnStatus.Failed:
      return colors.danger;
    case OfflineTxnStatus.Conflict:
      return colors.warning;
    case OfflineTxnStatus.Uploading:
      return colors.primary;
    default:
      return colors.textMuted;
  }
}

export function PendingSyncScreen() {
  const { isOnline } = useNetwork();
  const {
    ready,
    items,
    isSyncing,
    lastError,
    refresh,
    processQueue,
    retry,
    enqueueDemo,
  } = useOfflineSync();

  return (
    <Screen
      title="Pending Sync"
      subtitle={
        isOnline
          ? 'Offline queue syncs when online (media first, then transaction)'
          : 'You are offline — items stay queued locally'
      }
      scroll={false}
      rightSlot={
        <View style={styles.actions}>
          <Pressable onPress={() => void refresh()}>
            <Text style={styles.action}>Refresh</Text>
          </Pressable>
          <Pressable
            onPress={() => void processQueue()}
            disabled={!isOnline || isSyncing}
          >
            <Text
              style={[
                styles.action,
                (!isOnline || isSyncing) && styles.actionDisabled,
              ]}
            >
              Sync now
            </Text>
          </Pressable>
        </View>
      }
    >
      {lastError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{lastError}</Text>
        </View>
      ) : null}

      {!ready || isSyncing ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No pending items</Text>
            <Text style={styles.emptyText}>
              Offline transactions appear here with sync status, errors, and
              retry. Expense capture will enqueue into this engine later.
            </Text>
            <Pressable style={styles.demoButton} onPress={() => void enqueueDemo()}>
              <Text style={styles.demoButtonText}>Enqueue demo item</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const canRetry =
            item.status === OfflineTxnStatus.Failed ||
            item.status === OfflineTxnStatus.Conflict;
          const mediaPending = item.media.filter(
            (m) => m.uploadStatus !== 'uploaded',
          ).length;

          return (
            <View style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemType}>{item.type}</Text>
                <Text style={[styles.status, { color: statusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemMeta}>Device: {item.deviceTimestamp}</Text>
              <Text style={styles.itemMeta}>
                Server: {item.serverTimestamp ?? '—'}
              </Text>
              <Text style={styles.itemMeta}>
                Idempotency: {item.idempotencyKey}
              </Text>
              <Text style={styles.itemMeta}>
                Attempts: {item.attemptCount}
                {mediaPending > 0 ? ` · Media pending: ${mediaPending}` : ''}
              </Text>
              {item.lastError ? (
                <Text style={styles.itemError}>{item.lastError}</Text>
              ) : null}
              {item.media.map((m) =>
                m.lastError ? (
                  <Text key={m.id} style={styles.itemError}>
                    {m.fileName}: {m.lastError}
                  </Text>
                ) : null,
              )}
              {canRetry ? (
                <Pressable
                  style={styles.retryButton}
                  onPress={() => void retry(item.id)}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  action: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionDisabled: {
    opacity: 0.4,
  },
  errorBanner: {
    backgroundColor: '#F8E4E2',
    borderWidth: 1,
    borderColor: '#E3B0AB',
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  loader: {
    marginBottom: 8,
  },
  list: {
    paddingBottom: 24,
    gap: 10,
    flexGrow: 1,
  },
  emptyBox: {
    marginTop: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: 16,
  },
  demoButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  demoButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemType: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemLabel: {
    color: colors.text,
    fontSize: 15,
    marginBottom: 6,
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  itemError: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
