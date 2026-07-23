import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { formatInr } from '@/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

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
        <>
          <FormSection title="Receipt">
            <Field
              label="Status"
              value={receiptStatusLabel(item.status)}
            />
            <Field label="Amount" value={formatInr(item.amount)} />
            <Field
              label="Received"
              value={String(item.receivedDate).slice(0, 10)}
            />
            <Field
              label="Mode"
              value={paymentModeLabel(item.paymentMode)}
            />
            {item.transactionReference ? (
              <Field label="Ref" value={item.transactionReference} />
            ) : null}
            {item.remarks ? (
              <Field label="Remarks" value={item.remarks} />
            ) : null}
            {item.accountingNote ? (
              <Text style={styles.note}>{item.accountingNote}</Text>
            ) : null}
            {item.cancellationReason ? (
              <Field label="Cancelled" value={item.cancellationReason} />
            ) : null}
          </FormSection>

          {actions.length > 0 ? (
            <FormSection title="Actions" framed={false}>
              {actions.includes('submit') ? (
                <Button
                  label="Submit"
                  loading={acting}
                  disabled={acting}
                  onPress={() => void runAction('submit')}
                  style={styles.action}
                />
              ) : null}
              {actions.includes('verify') ? (
                <Button
                  label="Verify"
                  loading={acting}
                  disabled={acting}
                  onPress={() => void runAction('verify')}
                  style={styles.action}
                />
              ) : null}
              {actions.includes('post') ? (
                <Button
                  label="Post"
                  loading={acting}
                  disabled={acting}
                  onPress={() => void runAction('post')}
                  style={styles.action}
                />
              ) : null}
              {actions.includes('cancel') ? (
                !showCancel ? (
                  <Button
                    label="Cancel receipt"
                    variant="danger"
                    disabled={acting}
                    onPress={() => setShowCancel(true)}
                    style={styles.action}
                  />
                ) : (
                  <>
                    <TextField
                      label="Cancellation reason"
                      value={cancelReason}
                      onChangeText={setCancelReason}
                      placeholder="At least 5 characters"
                      multiline
                      style={styles.multiline}
                    />
                    <Button
                      label="Confirm cancel"
                      variant="danger"
                      loading={acting}
                      disabled={acting}
                      onPress={() => void runAction('cancel')}
                    />
                  </>
                )
              ) : null}
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
  note: { ...typography.meta, fontSize: 13, marginTop: spacing.xs },
  action: { marginBottom: spacing.sm },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
});
