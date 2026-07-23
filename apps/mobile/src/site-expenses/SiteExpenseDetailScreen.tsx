import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { formatInr } from '@/format';
import { SignatureCaptureField } from '@/labour-vouchers/components/SignatureCaptureField';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import type { LocalFile } from '@/utils/fileUpload';
import {
  approveSiteExpense,
  cancelSiteExpense,
  getSiteExpense,
  listExpenseCategories,
  postSiteExpense,
  rejectSiteExpense,
  returnSiteExpense,
  submitSiteExpense,
  updateSiteExpense,
  verifySiteExpense,
} from './api';
import { resolveExpenseCapabilities } from './permissions';
import {
  assertSignatureReady,
  hasSignatureAttachment,
} from './signatureRequired';
import {
  SiteExpenseAttachmentType,
  type ExpenseCategoryOption,
  type PublicSiteExpenseVoucher,
} from './types';
import { uploadExpenseDocument } from './uploadExpenseDocument';
import {
  isExpenseEditable,
  resolveExpenseDetailActions,
  type ExpenseDetailActionId,
} from './workflowActions';

type Props = NativeStackScreenProps<AppStackParamList, 'SiteExpenseDetail'>;

const ACTION_LABELS: Record<ExpenseDetailActionId, string> = {
  submit: 'Submit',
  verify: 'Verify',
  approve: 'Approve',
  reject: 'Reject',
  return: 'Return',
  post: 'Post to ledger',
  cancel: 'Cancel',
};

export function SiteExpenseDetailScreen({ route }: Props) {
  const { expenseId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolveExpenseCapabilities(hasPermission);
  const canUpload = hasPermission('document.upload');
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicSiteExpenseVoucher | null>(null);
  const [category, setCategory] = useState<ExpenseCategoryOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState(false);
  const [reason, setReason] = useState('');
  const [signature, setSignature] = useState<LocalFile | null>(null);

  const load = useCallback(async () => {
    if (!caps.canView) {
      setForbidden(true);
      setError('Missing expense.view');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to open expense');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await getSiteExpense(expenseId);
      setItem(row);
      setError(null);
      setForbidden(false);
      try {
        const categories = await listExpenseCategories();
        setCategory(
          categories.find((c) => c.id === row.expenseCategoryId) ?? null,
        );
      } catch {
        setCategory(null);
      }
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load expense'));
    } finally {
      setLoading(false);
    }
  }, [caps.canView, expenseId, isOnline]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const actions = useMemo(
    () => (item ? resolveExpenseDetailActions(item, caps) : []),
    [caps, item],
  );

  const editable = item ? isExpenseEditable(item) : false;
  const requiresSignature = Boolean(category?.requiresSignature);
  const hasExistingSignature = hasSignatureAttachment(item?.attachments);
  const needsReason = actions.some(
    (a) => a === 'reject' || a === 'return' || a === 'cancel',
  );

  const runAction = async (action: ExpenseDetailActionId) => {
    if (!item) return;
    if (
      (action === 'reject' || action === 'cancel') &&
      !reason.trim()
    ) {
      Alert.alert('Reason required', 'Enter a reason before continuing.');
      return;
    }

    setActing(true);
    try {
      let updated: PublicSiteExpenseVoucher;
      switch (action) {
        case 'submit': {
          let current = item;
          const hasSig = hasSignatureAttachment(current.attachments) || Boolean(signature);
          const sigCheck = assertSignatureReady({
            requiresSignature,
            hasSignature: hasSig,
          });
          if (!sigCheck.ok) {
            Alert.alert('Signature required', sigCheck.error);
            return;
          }
          if (signature) {
            if (!canUpload) {
              Alert.alert(
                'Access denied',
                'Missing document.upload permission for signature',
              );
              return;
            }
            const documentId = await uploadExpenseDocument({
              projectId: current.projectId,
              voucherId: current.id,
              documentType: 'signature',
              file: signature,
            });
            const prior = (current.attachments ?? []).filter(
              (a) => a.type !== SiteExpenseAttachmentType.Signature,
            );
            current = await updateSiteExpense(current.id, {
              attachments: [
                ...prior.map((a) => ({
                  type:
                    a.type === SiteExpenseAttachmentType.Bill ||
                    a.type === SiteExpenseAttachmentType.Photo ||
                    a.type === SiteExpenseAttachmentType.Other
                      ? a.type
                      : SiteExpenseAttachmentType.Other,
                  documentId: a.documentId ?? null,
                  fileName: a.fileName ?? null,
                  filePath: a.filePath ?? null,
                  mimeType: a.mimeType ?? null,
                })),
                {
                  type: SiteExpenseAttachmentType.Signature,
                  documentId,
                  fileName: signature.name,
                  mimeType: signature.mimeType,
                },
              ],
            });
            setSignature(null);
          }
          updated = await submitSiteExpense(current.id);
          break;
        }
        case 'verify':
          updated = await verifySiteExpense(item.id);
          break;
        case 'approve':
          updated = await approveSiteExpense(item.id);
          break;
        case 'post':
          updated = await postSiteExpense(item.id);
          break;
        case 'reject':
          updated = await rejectSiteExpense(item.id, { reason: reason.trim() });
          break;
        case 'return':
          updated = await returnSiteExpense(item.id, {
            comment: reason.trim() || null,
          });
          break;
        case 'cancel':
          updated = await cancelSiteExpense(item.id, {
            cancellationReason: reason.trim(),
          });
          break;
        default:
          return;
      }
      setItem(updated);
      setReason('');
      Alert.alert('Done', `${ACTION_LABELS[action]} · ${updated.voucherNumber}`);
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Action failed'));
    } finally {
      setActing(false);
    }
  };

  return (
    <Screen title="Site expense" subtitle={item?.voucherNumber ?? expenseId}>
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
          <Text style={styles.row}>Status: {item.status}</Text>
          <Text style={styles.row}>Amount: {formatInr(item.amount)}</Text>
          <Text style={styles.row}>Paid to: {item.paidTo}</Text>
          <Text style={styles.row}>Purpose: {item.purpose}</Text>
          <Text style={styles.row}>
            Date: {String(item.expenseDate).slice(0, 10)}
          </Text>
          <Text style={styles.row}>Mode: {item.paymentMode}</Text>
          <Text style={styles.row}>
            Signature:{' '}
            {hasExistingSignature
              ? 'Attached'
              : requiresSignature
                ? 'Required'
                : 'Not required'}
          </Text>
          {item.rejectionReason ? (
            <Text style={styles.row}>Rejection: {item.rejectionReason}</Text>
          ) : null}
          {item.cancellationReason ? (
            <Text style={styles.row}>Cancelled: {item.cancellationReason}</Text>
          ) : null}

          {editable ? (
            <SignatureCaptureField
              label="Beneficiary / engineer signature"
              required={requiresSignature && !hasExistingSignature}
              file={signature}
              attachedDocumentId={
                hasExistingSignature
                  ? item.attachments?.find(
                      (a) => a.type === SiteExpenseAttachmentType.Signature,
                    )?.documentId
                  : null
              }
              disabled={acting}
              onCaptured={setSignature}
            />
          ) : null}

          {actions.length > 0 ? (
            <>
              {needsReason ? (
                <>
                  <Text style={styles.label}>Reason / comment</Text>
                  <TextInput
                    style={styles.input}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Required for reject / cancel"
                    placeholderTextColor={colors.textMuted}
                    editable={!acting}
                  />
                </>
              ) : null}
              {actions.map((action) => {
                const danger =
                  action === 'reject' || action === 'cancel';
                return (
                  <Pressable
                    key={action}
                    style={[
                      danger ? styles.btnDanger : styles.btn,
                      acting && styles.disabled,
                    ]}
                    disabled={acting}
                    onPress={() => void runAction(action)}
                  >
                    <Text style={styles.btnText}>
                      {acting ? 'Working…' : ACTION_LABELS[action]}
                    </Text>
                  </Pressable>
                );
              })}
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
  label: { color: colors.textMuted, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    backgroundColor: colors.background,
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
