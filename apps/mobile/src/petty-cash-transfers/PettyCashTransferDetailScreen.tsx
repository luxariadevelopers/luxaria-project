import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  acknowledgePettyCashFundTransfer,
  fetchPettyCashFundTransfer,
  postPettyCashFundTransfer,
} from './api';
import { transferStatusLabel } from './labels';
import { resolvePettyCashTransferCapabilities } from './permissions';
import type { PublicPettyCashFundTransfer } from './types';
import {
  canVerifyTransfer,
  resolveTransferRowActions,
} from './workflowActions';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'PettyCashTransferDetail'
>;

export function PettyCashTransferDetailScreen({ route }: Props) {
  const { transferId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolvePettyCashTransferCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicPettyCashFundTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canView) {
      setForbidden(true);
      setError('Missing petty_cash.view');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to open fund transfer');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItem(await fetchPettyCashFundTransfer(transferId));
      setError(null);
      setForbidden(false);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load fund transfer'));
    } finally {
      setLoading(false);
    }
  }, [caps.canView, isOnline, transferId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const runAcknowledge = async () => {
    if (!item) return;
    if (!canVerifyTransfer(item)) {
      Alert.alert(
        'Cannot acknowledge',
        'Attach payment proof and transaction reference before acknowledge (verify).',
      );
      return;
    }
    setActing(true);
    try {
      const updated = await acknowledgePettyCashFundTransfer(item.id);
      setItem(updated);
      Alert.alert('Acknowledged', transferStatusLabel(updated.status));
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Acknowledge failed'));
    } finally {
      setActing(false);
    }
  };

  const runPost = async () => {
    if (!item) return;
    setActing(true);
    try {
      const updated = await postPettyCashFundTransfer(
        item.id,
        `pcft-post:${item.id}`,
      );
      setItem(updated);
      Alert.alert('Posted', transferStatusLabel(updated.status));
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Post failed'));
    } finally {
      setActing(false);
    }
  };

  const actions = item ? resolveTransferRowActions(item, caps) : [];

  return (
    <Screen
      title="Fund transfer"
      subtitle={item?.transferNumber ?? transferId}
    >
      {loading || error || forbidden || !item ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !item}
          emptyLabel="Not found"
          onRetry={() => void load()}
        />
      ) : (
        <View style={styles.card}>
          <Text style={styles.row}>
            Status: {transferStatusLabel(item.status)}
          </Text>
          <Text style={styles.row}>Amount: {formatInr(item.amount)}</Text>
          <Text style={styles.row}>
            Date: {String(item.transferDate).slice(0, 10)}
          </Text>
          <Text style={styles.row}>Request: …{item.requestId.slice(-8)}</Text>
          {item.transactionReference ? (
            <Text style={styles.row}>Ref: {item.transactionReference}</Text>
          ) : (
            <Text style={styles.meta}>No transaction reference yet</Text>
          )}
          {item.paymentProof ? (
            <Text style={styles.meta}>Payment proof attached</Text>
          ) : (
            <Text style={styles.meta}>No payment proof yet</Text>
          )}
          {item.journalEntryId ? (
            <Text style={styles.meta}>
              Journal: …{item.journalEntryId.slice(-8)}
            </Text>
          ) : null}
          {item.cancellationReason ? (
            <Text style={styles.row}>
              Cancelled: {item.cancellationReason}
            </Text>
          ) : null}

          {actions.includes('acknowledge') ? (
            <Pressable
              style={[styles.btn, acting && styles.disabled]}
              disabled={acting}
              onPress={() => void runAcknowledge()}
            >
              <Text style={styles.btnText}>
                {acting ? 'Working…' : 'Acknowledge'}
              </Text>
            </Pressable>
          ) : null}

          {actions.includes('post') ? (
            <Pressable
              style={[styles.btnSecondary, acting && styles.disabled]}
              disabled={acting}
              onPress={() => void runPost()}
            >
              <Text style={styles.btnSecondaryText}>
                {acting ? 'Working…' : 'Post to ledger'}
              </Text>
            </Pressable>
          ) : null}

          <Text style={styles.hint}>
            Acknowledge calls Nest verify (draft → verified). Post creates the
            journal entry.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
  row: { color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 13 },
  hint: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  btn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
  btnSecondary: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.text, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
