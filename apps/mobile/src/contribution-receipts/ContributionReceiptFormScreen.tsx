import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { formatInr } from '@/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
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

      <FormSection title="Participant & commitment">
        <Text style={styles.label}>Participant</Text>
        <View style={styles.chips}>
          {participants.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              selected={participantId === p.id}
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
            />
          ))}
        </View>

        <Text style={styles.label}>Commitment</Text>
        <View style={styles.chips}>
          {filteredCommitments.map((c) => (
            <Chip
              key={c.id}
              label={`${c.label} · open ${formatInr(c.pendingAmount)}`}
              selected={commitmentId === c.id}
              onPress={() => {
                setCommitmentId(c.id);
                if (!participantId) setParticipantId(c.participantId);
                if (!amount) setAmount(String(c.pendingAmount));
              }}
            />
          ))}
        </View>
        {filteredCommitments.length === 0 ? (
          <Text style={styles.hint}>
            No approved commitments with remaining headroom.
          </Text>
        ) : null}
      </FormSection>

      <FormSection title="Receipt details">
        <TextField
          label="Received date"
          value={receivedDate}
          onChangeText={setReceivedDate}
          autoCapitalize="none"
        />
        <TextField
          label="Amount"
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
            <Chip
              key={mode}
              label={paymentModeLabel(mode)}
              selected={paymentMode === mode}
              onPress={() => setPaymentMode(mode)}
            />
          ))}
        </View>

        {needsBank ? (
          <>
            <Text style={styles.label}>Bank account</Text>
            <View style={styles.chips}>
              {banks.map((b) => (
                <Chip
                  key={b.id}
                  label={b.label}
                  selected={bankAccountId === b.id}
                  onPress={() => setBankAccountId(b.id)}
                />
              ))}
            </View>
            {!caps.canViewBankAccounts ? (
              <TextField
                label="Bank account id"
                value={bankAccountId}
                onChangeText={setBankAccountId}
                placeholder="Bank account id"
                autoCapitalize="none"
              />
            ) : null}
            <TextField
              label="Transaction reference"
              value={transactionReference}
              onChangeText={setTransactionReference}
              autoCapitalize="none"
            />
          </>
        ) : null}

        <TextField
          label="Remarks"
          value={remarks}
          onChangeText={setRemarks}
          multiline
          style={styles.multiline}
        />
      </FormSection>

      <Button
        label="Create draft"
        loading={saving}
        disabled={saving}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.sm, marginTop: spacing.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  hint: { ...typography.meta, fontSize: 12, marginTop: spacing.xs },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
