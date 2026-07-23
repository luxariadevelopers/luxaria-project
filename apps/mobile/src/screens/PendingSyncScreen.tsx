import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
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
import { colors, radii, spacing, typography } from '@/theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'PendingSync'>,
  NativeStackNavigationProp<AppStackParamList>
>;

function statusTone(
  status: string,
  failureKind: string | null,
): 'default' | 'success' | 'warning' | 'danger' {
  if (
    failureKind === OfflineFailureKind.Permanent ||
    failureKind === OfflineFailureKind.Forbidden
  ) {
    return 'danger';
  }
  switch (status) {
    case OfflineTxnStatus.Synced:
      return 'success';
    case OfflineTxnStatus.Failed:
      return 'danger';
    case OfflineTxnStatus.Conflict:
      return 'warning';
    default:
      return 'default';
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
      showHeader
      rightSlot={
        <View style={styles.actions}>
          <Button
            label="Refresh"
            variant="ghost"
            onPress={() => void refresh()}
            style={styles.actionBtn}
          />
          <Button
            label="Sync now"
            onPress={() => void processQueue()}
            disabled={!isOnline || isSyncing}
            loading={isSyncing}
            style={styles.actionBtn}
          />
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
          <Button
            label="Retry load"
            variant="secondary"
            onPress={() => void refresh()}
          />
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
              <Button
                label="Enqueue demo item"
                onPress={() => void enqueueDemo()}
                style={styles.demoButton}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const mediaPending = item.media.filter(
            (m) => m.uploadStatus !== 'uploaded',
          ).length;
          const metaParts = [
            failureHeadline(item),
            `Attempts: ${item.attemptCount}`,
            mediaPending > 0 ? `Media pending: ${mediaPending}` : null,
          ].filter(Boolean);

          return (
            <ListRow
              title={item.label}
              meta={`${item.type} · ${metaParts.join(' · ')}`}
              status={statusLabel(item.status)}
              statusTone={statusTone(item.status, item.failureKind)}
              onPress={() =>
                navigation.navigate('ConflictDetail', {
                  transactionId: item.id,
                })
              }
            />
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  actionBtn: {
    minWidth: 96,
    paddingVertical: spacing.sm,
  },
  deniedBanner: {
    backgroundColor: '#F8E4E2',
    borderWidth: 1,
    borderColor: '#E3B0AB',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  deniedTitle: {
    color: colors.danger,
    fontWeight: '700',
    marginBottom: spacing.xs,
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
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  loader: {
    marginBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
    paddingTop: spacing.sm,
  },
  emptyBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 17,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.meta,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  demoButton: {
    alignSelf: 'flex-start',
  },
});
