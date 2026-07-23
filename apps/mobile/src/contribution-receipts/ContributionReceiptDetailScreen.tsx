import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatInr } from '@/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  cancelContributionReceipt,
  fetchContributionReceipt,
  postContributionReceipt,
  submitContributionReceipt,
  verifyContributionReceipt,
} from './api';
import { paymentModeLabel, receiptStatusLabel } from './labels';
import { resolveContributionReceiptCapabilities } from './permissions';
import type { PublicContributionReceipt } from './types';
import { validateCancelReason } from './validation';
import { resolveReceiptRowActions } from './workflowActions';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'ContributionReceiptDetail'
>;

export function ContributionReceiptDetailScreen({ route }: Props) {
  const { receiptId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolveContributionReceiptCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicContributionReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canView || !selectedProjectId) {
      setForbidden(!caps.canView);
      setError(
        !selectedProjectId
          ? 'Select a project first'
          : 'Missing contribution_receipt.view',
      );
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to open receipt');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItem(await fetchContributionReceipt(selectedProjectId, receiptId));
      setError(null);
      setForbidden(false);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load receipt'));
    } finally {
      setLoading(false);
    }
  }, [caps.canView, isOnline, receiptId, selectedProjectId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const runAction = async (kind: 'submit' | 'verify' | 'post' | 'cancel') => {
    if (!selectedProjectId || !item) return;
    if (kind === 'cancel') {
      const reasonError = validateCancelReason(cancelReason);
      if (reasonError) {
        Alert.alert('Cancel', reasonError);
        return;
      }
    }
    setActing(true);
    try {
      let updated: PublicContributionReceipt;
      if (kind === 'submit') {
        updated = await submitContributionReceipt(selectedProjectId, item.id);
      } else if (kind === 'verify') {
        updated = await verifyContributionReceipt(selectedProjectId, item.id);
      } else if (kind === 'post') {
        updated = await postContributionReceipt(selectedProjectId, item.id);
      } else {
        updated = await cancelContributionReceipt(
          selectedProjectId,
          item.id,
          { cancellationReason: cancelReason.trim() },
        );
        setShowCancel(false);
        setCancelReason('');
      }
      setItem(updated);
      Alert.alert('Done', `${receiptStatusLabel(updated.status)}`);
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Action failed'));
    } finally {
      setActing(false);
    }
  };

  const actions = item ? resolveReceiptRowActions(item, caps) : [];

  return (
    <Screen
      title="Contribution receipt"
      subtitle={item?.receiptNumber ?? receiptId}
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
            Status: {receiptStatusLabel(item.status)}
          </Text>
          <Text style={styles.row}>Amount: {formatInr(item.amount)}</Text>
          <Text style={styles.row}>
            Received: {String(item.receivedDate).slice(0, 10)}
          </Text>
          <Text style={styles.row}>
            Mode: {paymentModeLabel(item.paymentMode)}
          </Text>
          {item.transactionReference ? (
            <Text style={styles.row}>Ref: {item.transactionReference}</Text>
          ) : null}
          {item.remarks ? (
            <Text style={styles.row}>Remarks: {item.remarks}</Text>
          ) : null}
          {item.accountingNote ? (
            <Text style={styles.note}>{item.accountingNote}</Text>
          ) : null}
          {item.cancellationReason ? (
            <Text style={styles.row}>
              Cancelled: {item.cancellationReason}
            </Text>
          ) : null}

          {actions.includes('submit') ? (
            <Pressable
              style={[styles.btn, acting && styles.disabled]}
              disabled={acting}
              onPress={() => void runAction('submit')}
            >
              <Text style={styles.btnText}>
                {acting ? 'Working…' : 'Submit'}
              </Text>
            </Pressable>
          ) : null}
          {actions.includes('verify') ? (
            <Pressable
              style={[styles.btn, acting && styles.disabled]}
              disabled={acting}
              onPress={() => void runAction('verify')}
            >
              <Text style={styles.btnText}>
                {acting ? 'Working…' : 'Verify'}
              </Text>
            </Pressable>
          ) : null}
          {actions.includes('post') ? (
            <Pressable
              style={[styles.btn, acting && styles.disabled]}
              disabled={acting}
              onPress={() => void runAction('post')}
            >
              <Text style={styles.btnText}>
                {acting ? 'Working…' : 'Post'}
              </Text>
            </Pressable>
          ) : null}
          {actions.includes('cancel') ? (
            <>
              {!showCancel ? (
                <Pressable
                  style={[styles.btnDanger, acting && styles.disabled]}
                  disabled={acting}
                  onPress={() => setShowCancel(true)}
                >
                  <Text style={styles.btnText}>Cancel receipt</Text>
                </Pressable>
              ) : (
                <>
                  <Text style={styles.label}>Cancellation reason</Text>
                  <TextInput
                    style={styles.input}
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    placeholder="At least 5 characters"
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                  <Pressable
                    style={[styles.btnDanger, acting && styles.disabled]}
                    disabled={acting}
                    onPress={() => void runAction('cancel')}
                  >
                    <Text style={styles.btnText}>
                      {acting ? 'Working…' : 'Confirm cancel'}
                    </Text>
                  </Pressable>
                </>
              )}
            </>
          ) : null}
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
  note: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  label: { color: colors.textMuted, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    backgroundColor: colors.background,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  btn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDanger: {
    marginTop: 8,
    backgroundColor: colors.danger,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
