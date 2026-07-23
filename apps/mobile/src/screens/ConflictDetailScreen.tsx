import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
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
import { colors, radii, spacing, typography } from '@/theme';

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
        <AsyncStatePanel loading />
      </Screen>
    );
  }

  if (accessDenied) {
    return (
      <Screen title="Conflict detail" subtitle="Access restricted">
        <AsyncStatePanel
          forbidden
          error="You may only act on your own queued records for projects you can access."
          onRetry={() => void load()}
        />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen title="Conflict detail" subtitle="Missing record">
        <AsyncStatePanel
          empty
          emptyLabel={loadError ?? 'Queued record not found'}
          onRetry={() => void load()}
        />
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

      <FormSection title="Record">
        <Field label="Status" value={statusLabel(item.status)} />
        <Field label="Type" value={item.type} />
        <Field label="Label" value={item.label} />
        <Field label="Guidance" value={failureGuidance(item)} multiline />
        {item.lastError ? (
          <Field label="Error detail" value={item.lastError} danger multiline />
        ) : null}
        {item.lastErrorCode ? (
          <Field label="Error code" value={item.lastErrorCode} />
        ) : null}
        {isPermanent ? (
          <Text style={styles.badge}>Permanent validation — auto-retry off</Text>
        ) : null}
        {isForbidden ? (
          <Text style={styles.badge}>Forbidden (403) — restore access to sync</Text>
        ) : null}
        <Field label="Device timestamp" value={item.deviceTimestamp} />
        <Field label="Server timestamp" value={item.serverTimestamp ?? '—'} />
        <Field label="Idempotency key" value={item.idempotencyKey} mono />
        <Field label="Attempts" value={String(item.attemptCount)} />
        <Field label="Endpoint" value={`${item.method} ${item.endpoint}`} mono />
      </FormSection>

      {item.media.length > 0 ? (
        <FormSection title="Media">
          {item.media.map((m) => (
            <Text key={m.id} style={styles.mediaRow}>
              {m.fileName} · {m.uploadStatus}
              {m.lastError ? ` — ${m.lastError}` : ''}
            </Text>
          ))}
        </FormSection>
      ) : null}

      <FormSection title="Payload preview">
        <Text style={styles.payload}>{prettyPayload(item.payloadJson)}</Text>
      </FormSection>

      {showRetry ? (
        <Button
          label={isPermanent ? 'Retry after fix' : 'Retry sync'}
          loading={busy}
          onPress={onRetry}
          style={styles.action}
        />
      ) : null}

      {openTarget ? (
        <Button
          label={openTarget.label}
          variant="secondary"
          onPress={() => navigation.navigate(openTarget.screen)}
          style={styles.action}
        />
      ) : (
        <View style={styles.noteBox}>
          <Text style={styles.note}>
            No dedicated capture screen is wired for type “{item.type}”. Review
            the payload above, then retry or discard.
          </Text>
        </View>
      )}

      {showDiscard ? (
        <Button
          label="Discard draft…"
          variant="danger"
          disabled={busy}
          onPress={onDiscard}
          style={styles.action}
        />
      ) : null}

      <Text style={styles.footnote}>
        Discard never runs silently. Confirmed discard removes only this local
        queue row — not server records.
      </Text>
    </Screen>
  );
}

function Field({
  label,
  value,
  mono,
  danger,
  multiline,
}: {
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          mono && styles.mono,
          danger && styles.danger,
          multiline && styles.multiline,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#F8E4E2',
    borderWidth: 1,
    borderColor: '#E3B0AB',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  field: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    marginBottom: 2,
  },
  value: {
    ...typography.body,
    fontSize: 15,
  },
  multiline: {
    lineHeight: 21,
  },
  danger: {
    color: colors.danger,
  },
  badge: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.warning,
    fontWeight: '700',
    fontSize: 13,
  },
  mono: {
    fontSize: 12,
    fontFamily: 'Courier',
  },
  mediaRow: {
    ...typography.meta,
    marginBottom: spacing.xs,
  },
  payload: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Courier',
    lineHeight: 16,
  },
  action: {
    marginBottom: spacing.sm,
  },
  noteBox: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  note: {
    ...typography.meta,
    lineHeight: 19,
  },
  footnote: {
    ...typography.meta,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
