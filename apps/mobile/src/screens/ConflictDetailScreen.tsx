import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import {
  canDiscardQueueItem,
  useOfflineSync,
  type QueueItem,
} from '@/offline';
import { OfflineFailureKind, OfflineTxnStatus } from '@/offline/types';
import {
  canRetryQueueItem,
  failureGuidance,
  failureHeadline,
  resolveOpenRecord,
  statusLabel,
} from '@/sync-centre';
import { colors } from '@/theme/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'ConflictDetail'>;

function prettyPayload(payloadJson: string): string {
  try {
    return JSON.stringify(JSON.parse(payloadJson), null, 2);
  } catch {
    return payloadJson;
  }
}

export function ConflictDetailScreen({ navigation, route }: Props) {
  const { transactionId } = route.params;
  const { isOnline } = useNetwork();
  const {
    ready,
    accessDenied,
    lastError,
    getItemForActor,
    retry,
    discardDraft,
    refresh,
  } = useOfflineSync();
  const [item, setItem] = useState<QueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await getItemForActor(transactionId);
      setItem(next);
      if (!next) {
        setLoadError('Queued record not found or not accessible');
      }
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load queue item',
      );
    } finally {
      setLoading(false);
    }
  }, [getItemForActor, transactionId]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const onRetry = () => {
    void (async () => {
      setBusy(true);
      try {
        await retry(transactionId);
        await load();
        if (isOnline) {
          Alert.alert('Retry queued', 'Sync will run with the same Idempotency-Key.');
        } else {
          Alert.alert('Retry queued', 'Will sync when you are back online.');
        }
      } finally {
        setBusy(false);
      }
    })();
  };

  const onDiscard = () => {
    if (!item || !canDiscardQueueItem(item)) {
      Alert.alert(
        'Cannot discard',
        'Synced or in-progress uploads cannot be discarded from here.',
      );
      return;
    }

    Alert.alert(
      'Discard draft?',
      'This permanently removes the local queued record and its media. Submitted server data is never deleted this way. This cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await discardDraft(transactionId, true);
                await refresh();
                navigation.goBack();
              } catch (error) {
                Alert.alert(
                  'Discard blocked',
                  error instanceof Error
                    ? error.message
                    : 'Could not discard this draft',
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const openTarget = item ? resolveOpenRecord(item) : null;

  if (!ready || loading) {
    return (
      <Screen title="Conflict detail" subtitle="Loading queued record…">
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (accessDenied) {
    return (
      <Screen title="Conflict detail" subtitle="Access restricted">
        <View style={styles.deniedBox}>
          <Text style={styles.deniedTitle}>Permission denied</Text>
          <Text style={styles.deniedText}>
            You may only act on your own queued records for projects you can
            access.
          </Text>
          <Pressable style={styles.secondaryButton} onPress={() => void load()}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen title="Conflict detail" subtitle="Missing record">
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>
            {loadError ?? 'Queued record not found'}
          </Text>
          <Pressable style={styles.secondaryButton} onPress={() => void load()}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const showRetry = canRetryQueueItem(item);
  const showDiscard = canDiscardQueueItem(item);
  const isPermanent = item.failureKind === OfflineFailureKind.Permanent;
  const isForbidden = item.failureKind === OfflineFailureKind.Forbidden;

  return (
    <Screen
      title={
        item.status === OfflineTxnStatus.Conflict
          ? 'Conflict detail'
          : 'Sync issue'
      }
      subtitle={failureHeadline(item)}
    >
      {lastError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{lastError}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{statusLabel(item.status)}</Text>
        <Text style={styles.label}>Type</Text>
        <Text style={styles.value}>{item.type}</Text>
        <Text style={styles.label}>Label</Text>
        <Text style={styles.value}>{item.label}</Text>
        <Text style={styles.label}>Guidance</Text>
        <Text style={styles.guidance}>{failureGuidance(item)}</Text>
        {item.lastError ? (
          <>
            <Text style={styles.label}>Error detail</Text>
            <Text style={styles.errorDetail}>{item.lastError}</Text>
          </>
        ) : null}
        {item.lastErrorCode ? (
          <>
            <Text style={styles.label}>Error code</Text>
            <Text style={styles.value}>{item.lastErrorCode}</Text>
          </>
        ) : null}
        {isPermanent ? (
          <Text style={styles.badge}>Permanent validation — auto-retry off</Text>
        ) : null}
        {isForbidden ? (
          <Text style={styles.badge}>Forbidden (403) — restore access to sync</Text>
        ) : null}
        <Text style={styles.label}>Device timestamp</Text>
        <Text style={styles.value}>{item.deviceTimestamp}</Text>
        <Text style={styles.label}>Server timestamp</Text>
        <Text style={styles.value}>{item.serverTimestamp ?? '—'}</Text>
        <Text style={styles.label}>Idempotency key</Text>
        <Text style={styles.mono}>{item.idempotencyKey}</Text>
        <Text style={styles.label}>Attempts</Text>
        <Text style={styles.value}>{item.attemptCount}</Text>
        <Text style={styles.label}>Endpoint</Text>
        <Text style={styles.mono}>
          {item.method} {item.endpoint}
        </Text>
      </View>

      {item.media.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.section}>Media</Text>
          {item.media.map((m) => (
            <Text key={m.id} style={styles.mediaRow}>
              {m.fileName} · {m.uploadStatus}
              {m.lastError ? ` — ${m.lastError}` : ''}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.section}>Payload preview</Text>
        <Text style={styles.payload}>{prettyPayload(item.payloadJson)}</Text>
      </View>

      {showRetry ? (
        <Pressable
          style={[styles.primaryButton, busy && styles.disabled]}
          disabled={busy}
          onPress={onRetry}
        >
          <Text style={styles.primaryButtonText}>
            {isPermanent ? 'Retry after fix' : 'Retry sync'}
          </Text>
        </Pressable>
      ) : null}

      {openTarget ? (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate(openTarget.screen)}
        >
          <Text style={styles.secondaryButtonText}>{openTarget.label}</Text>
        </Pressable>
      ) : (
        <View style={styles.noteBox}>
          <Text style={styles.note}>
            No dedicated capture screen is wired for type “{item.type}”. Review
            the payload above, then retry or discard.
          </Text>
        </View>
      )}

      {showDiscard ? (
        <Pressable
          style={[styles.dangerButton, busy && styles.disabled]}
          disabled={busy}
          onPress={onDiscard}
        >
          <Text style={styles.dangerButtonText}>Discard draft…</Text>
        </Pressable>
      ) : null}

      <Text style={styles.footnote}>
        Discard never runs silently. Confirmed discard removes only this local
        queue row — not server records.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  deniedBox: {
    backgroundColor: '#F8E4E2',
    borderWidth: 1,
    borderColor: '#E3B0AB',
    padding: 16,
  },
  deniedTitle: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  deniedText: {
    color: colors.danger,
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 10,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  guidance: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  errorDetail: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  badge: {
    marginTop: 12,
    color: colors.warning,
    fontWeight: '700',
    fontSize: 13,
  },
  mono: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Courier',
  },
  section: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 8,
  },
  mediaRow: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  payload: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Courier',
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#F4F0E6',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButtonText: {
    color: colors.danger,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  noteBox: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  footnote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
