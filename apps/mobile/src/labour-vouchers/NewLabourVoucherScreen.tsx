import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, hitSlopMin, spacing, typography } from '@/theme';
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
    >
      <FormSection title="Recipient / gang">
        <TextField
          label="Name"
          value={form.recipientName}
          onChangeText={(v) => patch('recipientName', v)}
          placeholder="Worker or gang name"
          containerStyle={styles.field}
        />
        <TextField
          label="Mobile (optional)"
          value={form.recipientMobile}
          onChangeText={(v) => patch('recipientMobile', v)}
          keyboardType="phone-pad"
          containerStyle={styles.fieldLast}
        />
      </FormSection>

      <FormSection title="Work">
        <TextField
          label="Work description"
          value={form.workDescription}
          onChangeText={(v) => patch('workDescription', v)}
          multiline
          style={styles.multiline}
          containerStyle={styles.fieldLast}
        />
      </FormSection>

      <FormSection title="Attendance / quantity & rate">
        <View style={styles.row}>
          <TextField
            label="Quantity"
            value={form.attendanceQuantity}
            onChangeText={(v) => patch('attendanceQuantity', v)}
            keyboardType="decimal-pad"
            containerStyle={styles.half}
          />
          <TextField
            label="Rate"
            value={form.rate}
            onChangeText={(v) => patch('rate', v)}
            keyboardType="decimal-pad"
            containerStyle={styles.half}
          />
        </View>
        <TextField
          label="Deductions"
          value={form.deductions}
          onChangeText={(v) => patch('deductions', v)}
          keyboardType="decimal-pad"
          containerStyle={styles.fieldLast}
        />
        <AmountSummary amounts={amounts} reconcileOk={reconcileOk} />
        {'error' in derived ? (
          <Text style={styles.warn}>{derived.error}</Text>
        ) : null}
      </FormSection>

      <FormSection
        title="Payment mode"
        description="Nest vouchers pay from project petty cash (no alternate payment-mode field)."
      >
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
          <View style={styles.chips}>
            {accounts.map((account) => (
              <Chip
                key={account.id}
                label={`${account.accountCode} · ${account.accountName}`}
                selected={form.pettyCashAccountId === account.id}
                onPress={() => patch('pettyCashAccountId', account.id)}
              />
            ))}
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
      </FormSection>

      <FormSection title="Signatures" framed={false}>
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
      </FormSection>

      <Button
        label={
          gps
            ? `GPS ${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`
            : 'Capture GPS (optional)'
        }
        variant="secondary"
        onPress={() => void captureGps()}
        style={styles.action}
      />

      {draft ? (
        <Text style={styles.hint}>
          Draft {draft.voucherNumber} created — retry will reuse this voucher.
        </Text>
      ) : null}

      <Button
        label="Create, sign & submit"
        loading={saving}
        disabled={!reconcileOk}
        onPress={() => void onSubmit()}
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
  half: {
    flex: 1,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: hitSlopMin,
    marginTop: spacing.sm,
  },
  labelInline: {
    flex: 1,
    ...typography.bodyStrong,
    fontSize: 13,
  },
  hint: {
    ...typography.meta,
    marginBottom: spacing.md,
  },
  warn: {
    color: colors.danger,
    marginTop: spacing.sm,
    fontSize: 13,
  },
  action: {
    marginBottom: spacing.md,
  },
});
