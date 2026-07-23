import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { createAccount } from './api';
import { resolveProjectFinanceCapabilities } from './permissions';
import {
  AccountCategory,
  AccountType,
  type AccountCategory as AccountCategoryValue,
} from './types';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'QuickCreateExpenseAccount'
>;

const CATEGORY_OPTIONS: {
  value: AccountCategoryValue;
  label: string;
}[] = [
  { value: AccountCategory.DirectExpense, label: 'Direct expense' },
  { value: AccountCategory.IndirectExpense, label: 'Indirect expense' },
  { value: AccountCategory.LandCost, label: 'Land cost' },
  { value: AccountCategory.MaterialPurchase, label: 'Material purchase' },
  { value: AccountCategory.WorkInProgress, label: 'Work in progress' },
];

function accountTypeForCategory(category: AccountCategoryValue) {
  if (
    category === AccountCategory.LandCost ||
    category === AccountCategory.WorkInProgress
  ) {
    return AccountType.Asset;
  }
  return AccountType.Expense;
}

function suggestCode(name: string, category: AccountCategoryValue): string {
  const prefix =
    category === AccountCategory.LandCost
      ? '12'
      : category === AccountCategory.WorkInProgress
        ? '13'
        : category === AccountCategory.MaterialPurchase
          ? '51'
          : category === AccountCategory.DirectExpense
            ? '52'
            : '53';
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6);
  const stamp = Date.now().toString(36).toUpperCase().slice(-3);
  return `${prefix}${slug || 'EXP'}${stamp}`;
}

export function QuickCreateExpenseAccountScreen({ navigation, route }: Props) {
  const returnKind = route.params?.returnKind ?? 'expense';
  const { hasPermission } = useAuth();
  const caps = resolveProjectFinanceCapabilities(hasPermission);
  const [accountName, setAccountName] = useState('');
  const [accountCategory, setAccountCategory] = useState<AccountCategoryValue>(
    AccountCategory.IndirectExpense,
  );
  const [accountCode, setAccountCode] = useState(() =>
    suggestCode('', AccountCategory.IndirectExpense),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = useMemo(
    () => accountTypeForCategory(accountCategory),
    [accountCategory],
  );

  if (!caps.canManageAccounts) {
    return (
      <Screen title="New expense account" subtitle="Permission required">
        <Text style={styles.error}>You need account.manage.</Text>
      </Screen>
    );
  }

  const submit = async () => {
    const trimmedCode = accountCode.trim().toUpperCase();
    const trimmedName = accountName.trim();
    if (!trimmedName || !trimmedCode) {
      setError('Name and code are required');
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(trimmedCode)) {
      setError('Code must be alphanumeric (underscore/hyphen allowed)');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createAccount({
        accountCode: trimmedCode,
        accountName: trimmedName,
        accountType: accountTypeForCategory(accountCategory),
        accountCategory,
        parentAccountId: null,
        isControlAccount: false,
        allowManualPosting: true,
        requiresProject: true,
        requiresParty: false,
      });
      Alert.alert('Created', `${created.accountCode} · ${created.accountName}`);
      navigation.navigate({
        name: 'ProjectFinanceEntry',
        params: {
          kind: returnKind,
          createdAccountId: created.id,
        },
        merge: true,
      });
    } catch (err) {
      const next = suggestCode(trimmedName, accountCategory);
      setAccountCode(next === trimmedCode ? `${trimmedCode}-2` : next);
      setError(getErrorMessage(err, 'Create failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="New expense account" subtitle={`Type: ${typeLabel}`}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={accountName}
        onChangeText={(v) => {
          setAccountName(v);
          setAccountCode(suggestCode(v, accountCategory));
        }}
        placeholder="e.g. Auditor fee"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>Code</Text>
      <TextInput
        style={styles.input}
        value={accountCode}
        onChangeText={setAccountCode}
        autoCapitalize="characters"
      />
      <Text style={styles.label}>Category</Text>
      {CATEGORY_OPTIONS.map((opt) => {
        const selected = opt.value === accountCategory;
        return (
          <Pressable
            key={opt.value}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => {
              setAccountCategory(opt.value);
              setAccountCode(suggestCode(accountName, opt.value));
            }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        style={[styles.btn, saving && styles.disabled]}
        disabled={saving}
        onPress={() => void submit()}
      >
        <Text style={styles.btnText}>{saving ? 'Creating…' : 'Create'}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    backgroundColor: colors.surface,
  },
  error: { color: colors.danger, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 6,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: '#E8EEF1' },
  chipText: { color: colors.text },
  chipTextSelected: { fontWeight: '700' },
  btn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
