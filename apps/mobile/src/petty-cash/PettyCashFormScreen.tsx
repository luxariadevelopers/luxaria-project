import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { listCashAccounts } from '@/site-expenses/api';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { createPettyCashRequirement, submitPettyCashRequirement } from './api';
import { resolvePettyCashCapabilities } from './permissions';
import { PettyCashExpenseCategory } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PettyCashForm'>;

function weekRange() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    weekStartDate: start.toISOString().slice(0, 10),
    weekEndDate: end.toISOString().slice(0, 10),
  };
}

export function PettyCashFormScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolvePettyCashCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const range = weekRange();
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Array<{ id: string; accountName: string }>>([]);
  const [amount, setAmount] = useState('5000');
  const [description, setDescription] = useState('Weekly site float');
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    void listCashAccounts().then((rows) => {
      setAccounts(rows);
      if (!accountId && rows[0]) setAccountId(rows[0].id);
    }).catch((err) => setError(getErrorMessage(err, 'Could not load cash accounts')));
  }, [accountId, isOnline]);

  if (!caps.canRequest) {
    return (
      <Screen title="New petty cash" subtitle="Permission required">
        <Text style={styles.error}>You need petty_cash.request.</Text>
      </Screen>
    );
  }

  const submit = async () => {
    if (!selectedProject?.id) { setError('Select a project first'); return; }
    if (!isOnline) { setError('Requires network'); return; }
    const n = Number(amount);
    if (!accountId || !(n > 0) || !description.trim() || !justification.trim()) {
      setError('Account, amount, description and justification are required');
      return;
    }
    setSaving(true); setError(null);
    try {
      const created = await createPettyCashRequirement({
        projectId: selectedProject.id,
        pettyCashAccountId: accountId,
        weekStartDate: range.weekStartDate,
        weekEndDate: range.weekEndDate,
        justification: justification.trim(),
        requirementItems: [{
          expenseCategory: PettyCashExpenseCategory.SiteMisc,
          description: description.trim(),
          estimatedAmount: n,
        }],
      });
      const submitted = await submitPettyCashRequirement(created.id);
      Alert.alert('Submitted', submitted.requirementNumber);
      navigation.replace('PettyCashDetail', { requestId: submitted.id });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create request'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="New petty cash" subtitle={`${range.weekStartDate} → ${range.weekEndDate}`}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.label}>Cash account id</Text>
      <TextInput style={styles.input} value={accountId} onChangeText={setAccountId} autoCapitalize="none" />
      <View style={styles.chips}>
        {accounts.slice(0, 5).map((a) => (
          <Pressable key={a.id} style={[styles.chip, accountId === a.id && styles.chipActive]} onPress={() => setAccountId(a.id)}>
            <Text style={styles.chipText}>{a.accountName}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Estimated amount</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <Text style={styles.label}>Line description</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} />
      <Text style={styles.label}>Justification</Text>
      <TextInput style={[styles.input, styles.multiline]} value={justification} onChangeText={setJustification} multiline />
      <Pressable style={[styles.submit, saving && styles.disabled]} disabled={saving} onPress={() => void submit()}>
        <Text style={styles.submitText}>{saving ? 'Saving…' : 'Create & submit'}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  submit: { marginTop: 20, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, marginBottom: 8 },
});
