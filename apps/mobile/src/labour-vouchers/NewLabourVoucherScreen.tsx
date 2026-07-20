import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import type { LocalFile } from '@/utils/fileUpload';
import { getCurrentPosition } from '@/utils/permissions';
import {
  attachLabourVoucherSignatures,
  createLabourVoucher,
  listPettyCashAccounts,
  submitLabourVoucher,
} from './api';
import {
  amountsReconcile,
  deriveLabourAmounts,
} from './calculations';
import { AmountSummary } from './components/AmountSummary';
import { AsyncStatePanel } from './components/AsyncStatePanel';
import { SignatureCaptureField } from './components/SignatureCaptureField';
import { LABOUR_VOUCHER_PERMISSIONS } from './permissions';
import type {
  CashAccount,
  LabourVoucherAmounts,
  LabourVoucherFormValues,
  SignatureSlot,
  SignedPaymentVoucher,
} from './types';
import { SIGNED_PAYMENT_VOUCHER_TYPE } from './types';
import { uploadVoucherDocument } from './uploadVoucherDocument';
import { validateLabourVoucherForm } from './validateVoucher';

type Props = NativeStackScreenProps<AppStackParamList, 'NewLabourVoucher'>;

const emptyForm = (): LabourVoucherFormValues => ({
  recipientName: '',
  recipientMobile: '',
  workDescription: '',
  attendanceQuantity: '1',
  rate: '',
  deductions: '0',
  pettyCashAccountId: '',
  requiresWitnessSignature: true,
  requiresRecipientPhoto: false,
});

export function NewLabourVoucherScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();

  const canCreate = hasPermission(LABOUR_VOUCHER_PERMISSIONS.createOrSubmit);
  const canViewCash = hasPermission(LABOUR_VOUCHER_PERMISSIONS.viewCash);
  const canUpload = hasPermission(LABOUR_VOUCHER_PERMISSIONS.uploadDocument);

  const [form, setForm] = useState<LabourVoucherFormValues>(emptyForm);
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountsForbidden, setAccountsForbidden] = useState(false);

  const [recipientSig, setRecipientSig] = useState<LocalFile | null>(null);
  const [engineerSig, setEngineerSig] = useState<LocalFile | null>(null);
  const [witnessSig, setWitnessSig] = useState<LocalFile | null>(null);
  const [recipientPhoto, setRecipientPhoto] = useState<LocalFile | null>(null);

  const [gps, setGps] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<SignedPaymentVoucher | null>(null);

  const patch = useCallback(
    <K extends keyof LabourVoucherFormValues>(
      key: K,
      value: LabourVoucherFormValues[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const derived = useMemo(() => {
    return deriveLabourAmounts({
      attendanceQuantity: form.attendanceQuantity,
      rate: form.rate,
      deductions: form.deductions || '0',
    });
  }, [form.attendanceQuantity, form.deductions, form.rate]);

  const amounts: LabourVoucherAmounts | null =
    'error' in derived ? null : derived;
  const reconcileOk = amounts
    ? amountsReconcile(
        amounts.grossAmount,
        amounts.deductions,
        amounts.netAmount,
      )
    : false;

  const loadAccounts = useCallback(async () => {
    if (!selectedProject?.id || !canViewCash) {
      setAccounts([]);
      setAccountsForbidden(!canViewCash);
      setAccountsError(
        canViewCash ? null : 'Missing cash.view permission for petty-cash list',
      );
      return;
    }
    if (!isOnline) {
      setAccountsError('Go online to load petty-cash accounts');
      return;
    }
    setAccountsLoading(true);
    setAccountsError(null);
    setAccountsForbidden(false);
    try {
      const rows = await listPettyCashAccounts(selectedProject.id);
      setAccounts(rows);
      setForm((prev) => {
        if (prev.pettyCashAccountId || !rows[0]) return prev;
        return { ...prev, pettyCashAccountId: rows[0].id };
      });
    } catch (error) {
      setAccountsForbidden(isForbiddenError(error));
      setAccountsError(
        getErrorMessage(error, 'Could not load petty-cash accounts'),
      );
    } finally {
      setAccountsLoading(false);
    }
  }, [canViewCash, isOnline, selectedProject?.id]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const captureGps = useCallback(async () => {
    try {
      const position = await getCurrentPosition();
      setGps({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Location', getErrorMessage(error, 'Could not get GPS'));
    }
  }, []);

  const onSubmit = useCallback(async () => {
    if (!canCreate) {
      Alert.alert(
        'Access denied',
        'Missing payment.release permission to create/submit labour vouchers',
      );
      return;
    }
    if (!canUpload) {
      Alert.alert(
        'Access denied',
        'Missing document.upload permission for signatures',
      );
      return;
    }
    if (!selectedProject?.id) {
      Alert.alert('Project', 'Select a project first');
      return;
    }
    if (!isOnline) {
      Alert.alert('Offline', 'Labour vouchers require an online connection');
      return;
    }

    const validation = validateLabourVoucherForm(form, {
      requireSignatures: true,
      signatures: {
        recipient_signature: Boolean(recipientSig),
        engineer_signature: Boolean(engineerSig),
        witness_signature: Boolean(witnessSig),
        recipient_photo: Boolean(recipientPhoto),
      },
    });
    if (!validation.ok) {
      Alert.alert('Validation', validation.error);
      return;
    }
    const computed = validation.amounts;

    setSaving(true);
    try {
      let voucher = draft;
      if (!voucher) {
        const idempotencyKey = Crypto.randomUUID();
        voucher = await createLabourVoucher(
          {
            voucherType: SIGNED_PAYMENT_VOUCHER_TYPE.Labour,
            projectId: selectedProject.id,
            pettyCashAccountId: form.pettyCashAccountId.trim(),
            recipientName: form.recipientName.trim(),
            recipientMobile: form.recipientMobile.trim() || null,
            workDescription: form.workDescription.trim(),
            grossAmount: computed.grossAmount,
            deductions: computed.deductions,
            requiresWitnessSignature: form.requiresWitnessSignature,
            requiresRecipientPhoto: form.requiresRecipientPhoto,
            latitude: gps?.latitude ?? null,
            longitude: gps?.longitude ?? null,
            capturedAt: new Date().toISOString(),
            deviceId: Device.modelName ?? Device.deviceName ?? null,
          },
          idempotencyKey,
        );
        setDraft(voucher);
      }

      const uploads: Array<{ slot: SignatureSlot; file: LocalFile }> = [
        { slot: 'recipient_signature', file: recipientSig! },
        { slot: 'engineer_signature', file: engineerSig! },
      ];
      if (form.requiresWitnessSignature && witnessSig) {
        uploads.push({ slot: 'witness_signature', file: witnessSig });
      }
      if (form.requiresRecipientPhoto && recipientPhoto) {
        uploads.push({ slot: 'recipient_photo', file: recipientPhoto });
      }

      const documentIds: Record<string, string> = {};
      for (const item of uploads) {
        documentIds[item.slot] = await uploadVoucherDocument({
          projectId: selectedProject.id,
          voucherId: voucher.id,
          documentType: item.slot,
          file: item.file,
        });
      }

      voucher = await attachLabourVoucherSignatures(voucher.id, {
        recipientSignatureDocumentId: documentIds.recipient_signature,
        engineerSignatureDocumentId: documentIds.engineer_signature,
        witnessSignatureDocumentId: documentIds.witness_signature,
        recipientPhotoDocumentId: documentIds.recipient_photo,
      });

      voucher = await submitLabourVoucher(voucher.id);

      Alert.alert(
        'Submitted',
        `Labour voucher ${voucher.voucherNumber} submitted for approval.`,
        [
          {
            text: 'View',
            onPress: () =>
              navigation.replace('LabourVoucherDetail', {
                voucherId: voucher!.id,
              }),
          },
          {
            text: 'History',
            onPress: () => navigation.navigate('LabourVoucherHistory'),
          },
        ],
      );
    } catch (error) {
      if (isForbiddenError(error)) {
        Alert.alert(
          'Access denied',
          getErrorMessage(error, 'Forbidden'),
        );
      } else {
        Alert.alert(
          'Labour voucher',
          getErrorMessage(error, 'Could not submit voucher'),
        );
      }
    } finally {
      setSaving(false);
    }
  }, [
    canCreate,
    canUpload,
    draft,
    engineerSig,
    form,
    gps,
    isOnline,
    navigation,
    recipientPhoto,
    recipientSig,
    selectedProject?.id,
    witnessSig,
  ]);

  if (!canCreate) {
    return (
      <Screen title="New labour voucher" subtitle="Daily wage / payment">
        <AsyncStatePanel
          forbidden
          error="Missing payment.release permission (maps from labour_voucher.create/submit)."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="New labour voucher"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · create & submit`
          : 'Select a project first'
      }
      scroll={false}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Recipient / gang</Text>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={form.recipientName}
          onChangeText={(v) => patch('recipientName', v)}
          placeholder="Worker or gang name"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Mobile (optional)</Text>
        <TextInput
          style={styles.input}
          value={form.recipientMobile}
          onChangeText={(v) => patch('recipientMobile', v)}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.section}>Work</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.workDescription}
          onChangeText={(v) => patch('workDescription', v)}
          multiline
          placeholder="Work description"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.section}>Attendance / quantity & rate</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={form.attendanceQuantity}
              onChangeText={(v) => patch('attendanceQuantity', v)}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>Rate</Text>
            <TextInput
              style={styles.input}
              value={form.rate}
              onChangeText={(v) => patch('rate', v)}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <Text style={styles.label}>Deductions</Text>
        <TextInput
          style={styles.input}
          value={form.deductions}
          onChangeText={(v) => patch('deductions', v)}
          keyboardType="decimal-pad"
        />
        <AmountSummary amounts={amounts} reconcileOk={reconcileOk} />
        {'error' in derived ? (
          <Text style={styles.warn}>{derived.error}</Text>
        ) : null}

        <Text style={styles.section}>Payment mode</Text>
        <Text style={styles.hint}>
          Nest vouchers pay from project petty cash (no alternate payment-mode
          field).
        </Text>
        {accountsLoading || accountsError || accountsForbidden ? (
          <AsyncStatePanel
            loading={accountsLoading}
            error={accountsError}
            forbidden={accountsForbidden}
            onRetry={() => void loadAccounts()}
          />
        ) : accounts.length === 0 ? (
          <AsyncStatePanel
            empty
            emptyLabel="No active petty-cash accounts for this project"
            onRetry={() => void loadAccounts()}
          />
        ) : (
          <View style={styles.chipRow}>
            {accounts.map((account) => {
              const active = form.pettyCashAccountId === account.id;
              return (
                <Pressable
                  key={account.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => patch('pettyCashAccountId', account.id)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {account.accountCode} · {account.accountName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.switchRow}>
          <Text style={styles.labelInline}>Require witness signature</Text>
          <Switch
            value={form.requiresWitnessSignature}
            onValueChange={(v) => patch('requiresWitnessSignature', v)}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.labelInline}>Require recipient photo</Text>
          <Switch
            value={form.requiresRecipientPhoto}
            onValueChange={(v) => patch('requiresRecipientPhoto', v)}
          />
        </View>

        <Text style={styles.section}>Signatures</Text>
        <SignatureCaptureField
          label="Recipient signature"
          required
          file={recipientSig}
          onCaptured={setRecipientSig}
          disabled={saving}
        />
        <SignatureCaptureField
          label="Engineer signature"
          required
          file={engineerSig}
          onCaptured={setEngineerSig}
          disabled={saving}
        />
        <SignatureCaptureField
          label="Witness signature"
          required={form.requiresWitnessSignature}
          file={witnessSig}
          onCaptured={setWitnessSig}
          disabled={saving}
        />
        <SignatureCaptureField
          label="Recipient photo"
          required={form.requiresRecipientPhoto}
          file={recipientPhoto}
          onCaptured={setRecipientPhoto}
          disabled={saving}
        />

        <Pressable style={styles.secondaryButton} onPress={() => void captureGps()}>
          <Text style={styles.secondaryButtonText}>
            {gps
              ? `GPS ${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`
              : 'Capture GPS (optional)'}
          </Text>
        </Pressable>

        {draft ? (
          <Text style={styles.hint}>
            Draft {draft.voucherNumber} created — retry will reuse this voucher.
          </Text>
        ) : null}

        <Pressable
          style={[styles.primaryButton, saving && styles.disabled]}
          disabled={saving || !reconcileOk}
          onPress={() => void onSubmit()}
        >
          {saving ? (
            <ActivityIndicator color="#F4F0E6" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Create, sign & submit
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  section: {
    marginTop: 18,
    marginBottom: 6,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  labelInline: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: { color: colors.text, fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  warn: { color: colors.danger, marginTop: 8, fontSize: 13 },
  primaryButton: {
    marginTop: 22,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#F4F0E6', fontWeight: '700' },
  secondaryButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { color: colors.text, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
