import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { SignatureCaptureField } from '@/labour-vouchers/components/SignatureCaptureField';
import { useOfflineSync } from '@/offline';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
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
        <Text style={styles.error}>You need expense.create.</Text>
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
      <Text style={styles.label}>Date</Text>
      <TextInput style={styles.input} value={expenseDate} onChangeText={setExpenseDate} />
      <Text style={styles.label}>Petty cash account id</Text>
      <TextInput style={styles.input} value={pettyCashAccountId} onChangeText={setPettyCashAccountId} autoCapitalize="none" />
      <View style={styles.chips}>
        {accounts.slice(0, 5).map((a) => (
          <Pressable key={a.id} style={[styles.chip, pettyCashAccountId === a.id && styles.chipActive]} onPress={() => setPettyCashAccountId(a.id)}>
            <Text style={styles.chipText}>{a.accountCode || a.accountName}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Expense category id</Text>
      <TextInput style={styles.input} value={expenseCategoryId} onChangeText={setExpenseCategoryId} autoCapitalize="none" />
      <View style={styles.chips}>
        {categories.slice(0, 5).map((c) => (
          <Pressable key={c.id} style={[styles.chip, expenseCategoryId === c.id && styles.chipActive]} onPress={() => setExpenseCategoryId(c.id)}>
            <Text style={styles.chipText}>{c.code || c.name}</Text>
          </Pressable>
        ))}
      </View>
      {requiresSignature ? (
        <Text style={styles.hint}>This category requires a beneficiary / engineer signature.</Text>
      ) : null}
      <Text style={styles.label}>Amount</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <Text style={styles.label}>Paid to</Text>
      <TextInput style={styles.input} value={paidTo} onChangeText={setPaidTo} />
      <Text style={styles.label}>Purpose</Text>
      <TextInput style={[styles.input, styles.multiline]} value={purpose} onChangeText={setPurpose} multiline />
      <SignatureCaptureField
        label="Beneficiary / engineer signature"
        required={requiresSignature}
        file={signature}
        disabled={saving}
        onCaptured={setSignature}
      />
      <Pressable
        style={[styles.secondary, saving && styles.disabled]}
        disabled={saving}
        onPress={() => void saveDraftOnly()}
      >
        <Text style={styles.secondaryText}>Save draft</Text>
      </Pressable>
      <Pressable style={[styles.submit, saving && styles.disabled]} disabled={saving} onPress={() => void submit()}>
        <Text style={styles.submitText}>
          {saving ? 'Saving…' : isOnline ? 'Create & submit' : 'Save offline & submit'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  hint: { color: colors.textMuted, marginTop: 8, fontSize: 12 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  secondary: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '700' },
  submit: { marginTop: 12, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: '#B42318', marginBottom: 8 },
});
