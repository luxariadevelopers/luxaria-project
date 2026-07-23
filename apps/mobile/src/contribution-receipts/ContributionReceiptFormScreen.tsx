import { useCallback, useEffect, useMemo, useState } from 'react';
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
import * as Crypto from 'expo-crypto';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  createContributionReceipt,
  fetchBankAccountOptions,
  fetchCommitmentOptions,
  fetchParticipantOptions,
} from './api';
import { paymentModeLabel } from './labels';
import { resolveContributionReceiptCapabilities } from './permissions';
import {
  ContributionPaymentMode,
  type BankAccountOption,
  type CommitmentOption,
  type ParticipantOption,
} from './types';
import {
  paymentModeRequiresBankFields,
  validateContributionReceiptCreate,
} from './validation';

type Props = NativeStackScreenProps<AppStackParamList, 'ContributionReceiptForm'>;

const MODE_OPTIONS = Object.values(ContributionPaymentMode);

export function ContributionReceiptFormScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveContributionReceiptCapabilities(hasPermission);
  const { selectedProject, selectedProjectId } = useProject();
  const { isOnline } = useNetwork();

  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [commitments, setCommitments] = useState<CommitmentOption[]>([]);
  const [banks, setBanks] = useState<BankAccountOption[]>([]);
  const [participantId, setParticipantId] = useState('');
  const [commitmentId, setCommitmentId] = useState('');
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<string>(
    ContributionPaymentMode.BankTransfer,
  );
  const [bankAccountId, setBankAccountId] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLookups = useCallback(async () => {
    if (!isOnline || !selectedProjectId || !caps.canCreate) return;
    try {
      const [p, c, b] = await Promise.all([
        fetchParticipantOptions(selectedProjectId),
        fetchCommitmentOptions(selectedProjectId),
        caps.canViewBankAccounts
          ? fetchBankAccountOptions()
          : Promise.resolve([] as BankAccountOption[]),
      ]);
      setParticipants(p);
      setCommitments(c);
      setBanks(b);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load form lookups'));
    }
  }, [
    caps.canCreate,
    caps.canViewBankAccounts,
    isOnline,
    selectedProjectId,
  ]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  const filteredCommitments = useMemo(
    () =>
      participantId
        ? commitments.filter((c) => c.participantId === participantId)
        : commitments,
    [commitments, participantId],
  );

  const selectedCommitment = commitments.find((c) => c.id === commitmentId);
  const pendingHeadroom = selectedCommitment?.pendingAmount ?? 0;
  const needsBank = paymentModeRequiresBankFields(paymentMode);

  if (!caps.canCreate) {
    return (
      <Screen title="New contribution receipt" subtitle="Permission required">
        <Text style={styles.error}>You need contribution_receipt.create.</Text>
      </Screen>
    );
  }

  const submit = async () => {
    if (!selectedProjectId) {
      setError('Select a project first');
      return;
    }
    if (!isOnline) {
      setError('Go online to create a contribution receipt');
      return;
    }
    const validationError = validateContributionReceiptCreate(
      {
        participantId,
        commitmentId,
        receivedDate,
        amount,
        paymentMode,
        bankAccountId,
        transactionReference,
        remarks,
      },
      pendingHeadroom,
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createContributionReceipt(
        selectedProjectId,
        {
          participantId,
          commitmentId,
          receivedDate,
          amount: Number(amount),
          paymentMode: paymentMode as (typeof ContributionPaymentMode)[keyof typeof ContributionPaymentMode],
          bankAccountId: needsBank ? bankAccountId || null : null,
          transactionReference: needsBank
            ? transactionReference.trim() || null
            : null,
          remarks: remarks.trim() || null,
        },
        Crypto.randomUUID(),
      );
      Alert.alert('Created', created.receiptNumber);
      navigation.replace('ContributionReceiptDetail', {
        receiptId: created.id,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create receipt'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="New contribution receipt"
      subtitle={selectedProject?.projectCode ?? 'Select project'}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Participant</Text>
      <View style={styles.chips}>
        {participants.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.chip, participantId === p.id && styles.chipActive]}
            onPress={() => {
              setParticipantId(p.id);
              if (
                commitmentId &&
                !commitments.some(
                  (c) => c.id === commitmentId && c.participantId === p.id,
                )
              ) {
                setCommitmentId('');
              }
            }}
          >
            <Text style={styles.chipText}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Commitment</Text>
      <View style={styles.chips}>
        {filteredCommitments.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, commitmentId === c.id && styles.chipActive]}
            onPress={() => {
              setCommitmentId(c.id);
              if (!participantId) setParticipantId(c.participantId);
              if (!amount) setAmount(String(c.pendingAmount));
            }}
          >
            <Text style={styles.chipText}>
              {c.label} · open {formatInr(c.pendingAmount)}
            </Text>
          </Pressable>
        ))}
      </View>
      {filteredCommitments.length === 0 ? (
        <Text style={styles.hint}>
          No approved commitments with remaining headroom.
        </Text>
      ) : null}

      <Text style={styles.label}>Received date</Text>
      <TextInput
        style={styles.input}
        value={receivedDate}
        onChangeText={setReceivedDate}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
      {pendingHeadroom > 0 ? (
        <Text style={styles.hint}>
          Remaining commitment: {formatInr(pendingHeadroom)}
        </Text>
      ) : null}

      <Text style={styles.label}>Payment mode</Text>
      <View style={styles.chips}>
        {MODE_OPTIONS.map((mode) => (
          <Pressable
            key={mode}
            style={[styles.chip, paymentMode === mode && styles.chipActive]}
            onPress={() => setPaymentMode(mode)}
          >
            <Text style={styles.chipText}>{paymentModeLabel(mode)}</Text>
          </Pressable>
        ))}
      </View>

      {needsBank ? (
        <>
          <Text style={styles.label}>Bank account</Text>
          <View style={styles.chips}>
            {banks.map((b) => (
              <Pressable
                key={b.id}
                style={[
                  styles.chip,
                  bankAccountId === b.id && styles.chipActive,
                ]}
                onPress={() => setBankAccountId(b.id)}
              >
                <Text style={styles.chipText}>{b.label}</Text>
              </Pressable>
            ))}
          </View>
          {!caps.canViewBankAccounts ? (
            <TextInput
              style={styles.input}
              value={bankAccountId}
              onChangeText={setBankAccountId}
              placeholder="Bank account id"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          ) : null}
          <Text style={styles.label}>Transaction reference</Text>
          <TextInput
            style={styles.input}
            value={transactionReference}
            onChangeText={setTransactionReference}
            autoCapitalize="none"
          />
        </>
      ) : null}

      <Text style={styles.label}>Remarks</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={remarks}
        onChangeText={setRemarks}
        multiline
      />

      <Pressable
        style={[styles.submit, saving && styles.disabled]}
        disabled={saving}
        onPress={() => void submit()}
      >
        <Text style={styles.submitText}>
          {saving ? 'Creating…' : 'Create draft'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  submit: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, marginBottom: 8 },
});
