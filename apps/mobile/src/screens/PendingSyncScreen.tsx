import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList, MainTabParamList } from '@/navigation/types';
import { useOfflineSync } from '@/offline';
import { OfflineFailureKind, OfflineTxnStatus } from '@/offline/types';
import {
  QueueFilter,
  QueueFilterBar,
  countNeedsAttention,
  failureHeadline,
  filterQueueItems,
  statusLabel,
} from '@/sync-centre';
import { colors } from '@/theme/colors';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'PendingSync'>,
  NativeStackNavigationProp<AppStackParamList>
>;

function statusColor(status: string, failureKind: string | null) {
  if (failureKind === OfflineFailureKind.Permanent) return colors.danger;
  if (failureKind === OfflineFailureKind.Forbidden) return colors.danger;
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
  const navigation = useNavigation<Nav>();
  const {
    ready,
    items,
    isSyncing,
    lastError,
    accessDenied,
    refresh,
    processQueue,
    enqueueDemo,
  } = useOfflineSync();
  const [filter, setFilter] = useState<QueueFilter>(QueueFilter.NeedsAttention);

  const filtered = useMemo(
    () => filterQueueItems(items, filter),
    [items, filter],
  );
  const attentionCount = useMemo(() => countNeedsAttention(items), [items]);

  return (
    <Screen
      title="Pending Sync"
      subtitle={
        isOnline
          ? attentionCount > 0
            ? `${attentionCount} item(s) need resolution`
            : 'Offline queue syncs when online (media first, then transaction)'
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
      {accessDenied ? (
        <View style={styles.deniedBanner}>
          <Text style={styles.deniedTitle}>Permission denied</Text>
          <Text style={styles.deniedText}>
            You can only view and resolve your own queued records for projects
            you can access.
          </Text>
        </View>
      ) : null}

      {lastError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{lastError}</Text>
          <Pressable onPress={() => void refresh()}>
            <Text style={styles.action}>Retry load</Text>
          </Pressable>
        </View>
      ) : null}

      {!ready || isSyncing ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}

      <QueueFilterBar value={filter} onChange={setFilter} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              {items.length === 0
                ? 'No pending items'
                : 'No items in this filter'}
            </Text>
            <Text style={styles.emptyText}>
              Failed and conflicting syncs appear here with clear errors. Open
              any row to retry, discard a draft (with confirmation), or open the
              related capture form.
            </Text>
            {items.length === 0 ? (
              <Pressable
                style={styles.demoButton}
                onPress={() => void enqueueDemo()}
              >
                <Text style={styles.demoButtonText}>Enqueue demo item</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const mediaPending = item.media.filter(
            (m) => m.uploadStatus !== 'uploaded',
          ).length;

          return (
            <Pressable
              style={styles.item}
              onPress={() =>
                navigation.navigate('ConflictDetail', { transactionId: item.id })
              }
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemType}>{item.type}</Text>
                <Text
                  style={[
                    styles.status,
                    {
                      color: statusColor(item.status, item.failureKind),
                    },
                  ]}
                >
                  {statusLabel(item.status)}
                </Text>
              </View>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.headline}>{failureHeadline(item)}</Text>
              <Text style={styles.itemMeta}>Device: {item.deviceTimestamp}</Text>
              <Text style={styles.itemMeta}>
                Server: {item.serverTimestamp ?? '—'}
              </Text>
              <Text style={styles.itemMeta}>
                Attempts: {item.attemptCount}
                {mediaPending > 0 ? ` · Media pending: ${mediaPending}` : ''}
              </Text>
              {item.lastError ? (
                <Text style={styles.itemError} numberOfLines={2}>
                  {item.lastError}
                </Text>
              ) : null}
              <Text style={styles.openHint}>Open detail →</Text>
            </Pressable>
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
  deniedBanner: {
    backgroundColor: '#F8E4E2',
    borderWidth: 1,
    borderColor: '#E3B0AB',
    padding: 12,
    marginBottom: 12,
  },
  deniedTitle: {
    color: colors.danger,
    fontWeight: '700',
    marginBottom: 4,
  },
  deniedText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: '#F8E4E2',
    borderWidth: 1,
    borderColor: '#E3B0AB',
    padding: 12,
    marginBottom: 12,
    gap: 8,
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
    marginTop: 16,
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
    marginBottom: 4,
  },
  headline: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
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
  openHint: {
    marginTop: 10,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
