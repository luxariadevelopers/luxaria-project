import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

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
        <>
          <FormSection title="Transfer">
            <Field
              label="Status"
              value={transferStatusLabel(item.status)}
            />
            <Field label="Amount" value={formatInr(item.amount)} />
            <Field
              label="Date"
              value={String(item.transferDate).slice(0, 10)}
            />
            <Field label="Request" value={`…${item.requestId.slice(-8)}`} />
            <Field
              label="Transaction ref"
              value={item.transactionReference || 'Not set'}
            />
            <Field
              label="Payment proof"
              value={item.paymentProof ? 'Attached' : 'Not attached'}
            />
            {item.journalEntryId ? (
              <Field
                label="Journal"
                value={`…${item.journalEntryId.slice(-8)}`}
              />
            ) : null}
            {item.cancellationReason ? (
              <Field label="Cancelled" value={item.cancellationReason} />
            ) : null}
          </FormSection>

          {actions.includes('acknowledge') || actions.includes('post') ? (
            <FormSection title="Actions" framed={false}>
              {actions.includes('acknowledge') ? (
                <Button
                  label="Acknowledge"
                  loading={acting}
                  disabled={acting}
                  onPress={() => void runAcknowledge()}
                  style={styles.action}
                />
              ) : null}
              {actions.includes('post') ? (
                <Button
                  label="Post to ledger"
                  variant="secondary"
                  loading={acting}
                  disabled={acting}
                  onPress={() => void runPost()}
                  style={styles.action}
                />
              ) : null}
              <Text style={styles.hint}>
                Acknowledge calls Nest verify (draft → verified). Post creates
                the journal entry.
              </Text>
            </FormSection>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 2, marginBottom: spacing.sm },
  fieldLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 12,
  },
  fieldValue: { ...typography.body, color: colors.text },
  action: { marginBottom: spacing.sm },
  hint: {
    ...typography.meta,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
});
