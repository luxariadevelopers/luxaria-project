import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { SignatureCaptureField } from '@/labour-vouchers/components/SignatureCaptureField';
import { useOfflineSync } from '@/offline';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import type { LocalFile } from '@/utils/fileUpload';
import {
  createSiteExpense,
  listCashAccounts,
  listExpenseCategories,
  submitSiteExpense,
  updateSiteExpense,
} from './api';
import { buildSiteExpenseOfflineEnqueue } from './buildSiteExpenseOfflineEnqueue';
import {
  clearSiteExpenseDraft,
  createSiteExpenseDraftId,
  loadSiteExpenseDraft,
  saveSiteExpenseDraft,
  type DraftStorage,
} from './draftStore';
import { resolveExpenseCapabilities } from './permissions';
import { assertSignatureReady } from './signatureRequired';
import {
  SiteExpenseAttachmentType,
  SiteExpensePaymentMode,
  type CashAccountOption,
  type ExpenseCategoryOption,
  type SiteExpenseLocalDraft,
} from './types';
import { uploadExpenseDocument } from './uploadExpenseDocument';

type Props = NativeStackScreenProps<AppStackParamList, 'SiteExpenseForm'>;

const asyncDraftStorage: DraftStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

function signatureFromDraft(draft: SiteExpenseLocalDraft): LocalFile | null {
  if (!draft.signatureUri) return null;
  return {
    uri: draft.signatureUri,
    name: draft.signatureName ?? 'signature.png',
    mimeType: draft.signatureMimeType ?? 'image/png',
    size: draft.signatureSize ?? undefined,
  };
}

export function SiteExpenseFormScreen({ navigation, route }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveExpenseCapabilities(hasPermission);
  const canUpload = hasPermission('document.upload');
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const { enqueue } = useOfflineSync();
  const routeDraftId = route.params?.draftId;

  const [accounts, setAccounts] = useState<CashAccountOption[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryOption[]>([]);
  const [draftId, setDraftId] = useState(() => routeDraftId ?? createSiteExpenseDraftId());
  const [draftCreatedAt, setDraftCreatedAt] = useState(() => new Date().toISOString());
  const [pettyCashAccountId, setPettyCashAccountId] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [purpose, setPurpose] = useState('');
  const [signature, setSignature] = useState<LocalFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === expenseCategoryId) ?? null,
    [categories, expenseCategoryId],
  );
  const requiresSignature = Boolean(selectedCategory?.requiresSignature);

  const buildDraft = useCallback((): SiteExpenseLocalDraft | null => {
    if (!selectedProject?.id) return null;
    return {
      id: draftId,
      projectId: selectedProject.id,
      pettyCashAccountId,
      expenseCategoryId,
      expenseDate,
      amount,
      paidTo,
      purpose,
      paymentMode: SiteExpensePaymentMode.Cash,
      mobileNumber: null,
      signatureUri: signature?.uri ?? null,
      signatureName: signature?.name ?? null,
      signatureMimeType: signature?.mimeType ?? null,
      signatureSize: signature?.size ?? null,
      photoUri: null,
      photoName: null,
      photoMimeType: null,
      photoSize: null,
      requiresSignature: Boolean(selectedCategory?.requiresSignature),
      requiresBill: Boolean(selectedCategory?.requiresBill),
      requiresPhoto: Boolean(selectedCategory?.requiresPhoto),
      createdAt: draftCreatedAt,
      updatedAt: new Date().toISOString(),
    };
  }, [
    amount,
    draftCreatedAt,
    draftId,
    expenseCategoryId,
    expenseDate,
    paidTo,
    pettyCashAccountId,
    purpose,
    selectedCategory?.requiresBill,
    selectedCategory?.requiresPhoto,
    selectedCategory?.requiresSignature,
    selectedProject?.id,
    signature,
  ]);

  const hasDraftContent = Boolean(
    routeDraftId ||
      paidTo.trim() ||
      purpose.trim() ||
      amount.trim() ||
      signature,
  );

  const persistDraft = useCallback(async () => {
    const draft = buildDraft();
    if (!draft) return;
    await saveSiteExpenseDraft(draft, asyncDraftStorage);
  }, [buildDraft]);

  const loadLookups = useCallback(async () => {
    if (!isOnline) return;
    try {
      const [a, c] = await Promise.all([listCashAccounts(), listExpenseCategories()]);
      setAccounts(a);
      setCategories(c);
      if (!pettyCashAccountId && a[0]) setPettyCashAccountId(a[0].id);
      if (!expenseCategoryId && c[0]) setExpenseCategoryId(c[0].id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load cash/categories'));
    }
  }, [expenseCategoryId, isOnline, pettyCashAccountId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!routeDraftId || !selectedProject?.id) {
        hydrated.current = true;
        return;
      }
      try {
        const draft = await loadSiteExpenseDraft(
          selectedProject.id,
          routeDraftId,
          asyncDraftStorage,
        );
        if (cancelled || !draft) {
          hydrated.current = true;
          return;
        }
        setDraftId(draft.id);
        setDraftCreatedAt(draft.createdAt);
        setPettyCashAccountId(draft.pettyCashAccountId);
        setExpenseCategoryId(draft.expenseCategoryId);
        setExpenseDate(draft.expenseDate);
        setAmount(draft.amount);
        setPaidTo(draft.paidTo);
        setPurpose(draft.purpose);
        setSignature(signatureFromDraft(draft));
      } finally {
        if (!cancelled) hydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeDraftId, selectedProject?.id]);

  useEffect(() => { void loadLookups(); }, [loadLookups]);

  useEffect(() => {
    if (!hydrated.current || !selectedProject?.id || !hasDraftContent) return;
    const handle = setTimeout(() => {
      void persistDraft();
    }, 400);
    return () => clearTimeout(handle);
  }, [
    amount,
    expenseCategoryId,
    expenseDate,
    hasDraftContent,
    paidTo,
    persistDraft,
    pettyCashAccountId,
    purpose,
    selectedProject?.id,
    signature,
  ]);

  if (!caps.canCreate) {
    return (
      <Screen title="New site expense" subtitle="Permission required">
        <AsyncStatePanel
          forbidden
          error="You need expense.create."
        />
      </Screen>
    );
  }

  const saveDraftOnly = async () => {
    if (!selectedProject?.id) {
      setError('Select a project first');
      return;
    }
    try {
      await persistDraft();
      Alert.alert('Draft saved', 'You can resume this expense from Drafts.');
      navigation.goBack();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save draft'));
    }
  };

  const submit = async () => {
    if (!selectedProject?.id) { setError('Select a project first'); return; }
    const n = Number(amount);
    if (!pettyCashAccountId || !expenseCategoryId || !paidTo.trim() || !purpose.trim() || !(n > 0)) {
      setError('Account, category, paid to, purpose and amount are required');
      return;
    }
    const sigCheck = assertSignatureReady({
      requiresSignature,
      hasSignature: Boolean(signature),
    });
    if (!sigCheck.ok) {
      setError(sigCheck.error);
      return;
    }
    if (signature && !canUpload && isOnline) {
      setError('Missing document.upload permission for signature');
      return;
    }
    if (!isOnline && (!accounts.length || !categories.length)) {
      setError('Load cash accounts and categories while online first, then capture offline.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      projectId: selectedProject.id,
      pettyCashAccountId,
      expenseDate,
      expenseCategoryId,
      amount: n,
      paidTo: paidTo.trim(),
      purpose: purpose.trim(),
      paymentMode: SiteExpensePaymentMode.Cash,
      offlineCapturedAt: new Date().toISOString(),
    };
    try {
      if (isOnline) {
        let created = await createSiteExpense(payload);
        if (signature) {
          const documentId = await uploadExpenseDocument({
            projectId: selectedProject.id,
            voucherId: created.id,
            documentType: 'signature',
            file: signature,
          });
          created = await updateSiteExpense(created.id, {
            attachments: [
              {
                type: SiteExpenseAttachmentType.Signature,
                documentId,
                fileName: signature.name,
                mimeType: signature.mimeType,
              },
            ],
          });
        }
        const submitted = await submitSiteExpense(created.id);
        await clearSiteExpenseDraft(selectedProject.id, draftId, asyncDraftStorage);
        Alert.alert('Submitted', submitted.voucherNumber);
        navigation.replace('SiteExpenseDetail', { expenseId: submitted.id });
      } else {
        await enqueue(
          buildSiteExpenseOfflineEnqueue({
            ...payload,
            requiresSignature,
            signature,
          }),
        );
        await clearSiteExpenseDraft(selectedProject.id, draftId, asyncDraftStorage);
        Alert.alert(
          'Queued',
          'Site expense saved offline. It will sync when you are back online.',
        );
        navigation.goBack();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save expense'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title={routeDraftId ? 'Edit draft expense' : 'New site expense'}
      subtitle={selectedProject?.projectCode ?? 'Select project'}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FormSection title="Expense">
        <TextField
          label="Date"
          value={expenseDate}
          onChangeText={setExpenseDate}
          containerStyle={styles.field}
        />
        <TextField
          label="Petty cash account id"
          value={pettyCashAccountId}
          onChangeText={setPettyCashAccountId}
          autoCapitalize="none"
          containerStyle={styles.field}
        />
        <View style={styles.chips}>
          {accounts.slice(0, 5).map((a) => (
            <Chip
              key={a.id}
              label={a.accountCode || a.accountName}
              selected={pettyCashAccountId === a.id}
              onPress={() => setPettyCashAccountId(a.id)}
            />
          ))}
        </View>
        <TextField
          label="Expense category id"
          value={expenseCategoryId}
          onChangeText={setExpenseCategoryId}
          autoCapitalize="none"
          containerStyle={styles.field}
        />
        <View style={styles.chips}>
          {categories.slice(0, 5).map((c) => (
            <Chip
              key={c.id}
              label={c.code || c.name}
              selected={expenseCategoryId === c.id}
              onPress={() => setExpenseCategoryId(c.id)}
            />
          ))}
        </View>
        {requiresSignature ? (
          <Text style={styles.hint}>
            This category requires a beneficiary / engineer signature.
          </Text>
        ) : null}
        <TextField
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          containerStyle={styles.field}
        />
        <TextField
          label="Paid to"
          value={paidTo}
          onChangeText={setPaidTo}
          containerStyle={styles.field}
        />
        <TextField
          label="Purpose"
          value={purpose}
          onChangeText={setPurpose}
          multiline
          style={styles.multiline}
          containerStyle={styles.fieldLast}
        />
      </FormSection>

      <FormSection title="Signature" framed={false}>
        <SignatureCaptureField
          label="Beneficiary / engineer signature"
          required={requiresSignature}
          file={signature}
          disabled={saving}
          onCaptured={setSignature}
        />
      </FormSection>

      <Button
        label="Save draft"
        variant="secondary"
        disabled={saving}
        onPress={() => void saveDraftOnly()}
        style={styles.action}
      />
      <Button
        label={
          saving
            ? 'Saving…'
            : isOnline
              ? 'Create & submit'
              : 'Save offline & submit'
        }
        loading={saving}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  fieldLast: {
    marginBottom: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.meta,
    marginBottom: spacing.md,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  action: {
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
