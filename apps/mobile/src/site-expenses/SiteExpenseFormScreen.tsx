import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  createSiteExpense,
  listCashAccounts,
  listExpenseCategories,
  submitSiteExpense,
} from './api';
import { resolveExpenseCapabilities } from './permissions';
import {
  SiteExpensePaymentMode,
  type CashAccountOption,
  type ExpenseCategoryOption,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'SiteExpenseForm'>;

export function SiteExpenseFormScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveExpenseCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [accounts, setAccounts] = useState<CashAccountOption[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryOption[]>([]);
  const [pettyCashAccountId, setPettyCashAccountId] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { void loadLookups(); }, [loadLookups]);

  if (!caps.canCreate) {
    return (
      <Screen title="New site expense" subtitle="Permission required">
        <Text style={styles.error}>You need expense.create.</Text>
      </Screen>
    );
  }

  const submit = async () => {
    if (!selectedProject?.id) { setError('Select a project first'); return; }
    if (!isOnline) { setError('Site expense create requires network'); return; }
    const n = Number(amount);
    if (!pettyCashAccountId || !expenseCategoryId || !paidTo.trim() || !purpose.trim() || !(n > 0)) {
      setError('Account, category, paid to, purpose and amount are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createSiteExpense({
        projectId: selectedProject.id,
        pettyCashAccountId,
        expenseDate,
        expenseCategoryId,
        amount: n,
        paidTo: paidTo.trim(),
        purpose: purpose.trim(),
        paymentMode: SiteExpensePaymentMode.Cash,
      });
      const submitted = await submitSiteExpense(created.id);
      Alert.alert('Submitted', submitted.voucherNumber);
      navigation.replace('SiteExpenseDetail', { expenseId: submitted.id });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save expense'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="New site expense" subtitle={selectedProject?.projectCode ?? 'Select project'}>
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
      <Text style={styles.label}>Amount</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <Text style={styles.label}>Paid to</Text>
      <TextInput style={styles.input} value={paidTo} onChangeText={setPaidTo} />
      <Text style={styles.label}>Purpose</Text>
      <TextInput style={[styles.input, styles.multiline]} value={purpose} onChangeText={setPurpose} multiline />
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
  error: { color: '#B42318', marginBottom: 8 },
});
