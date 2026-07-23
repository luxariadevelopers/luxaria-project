import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing } from '@/theme';
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
      <FormSection title="Account">
        <TextField
          label="Name"
          value={accountName}
          onChangeText={(v) => {
            setAccountName(v);
            setAccountCode(suggestCode(v, accountCategory));
          }}
          placeholder="e.g. Auditor fee"
        />
        <TextField
          label="Code"
          value={accountCode}
          onChangeText={setAccountCode}
          autoCapitalize="characters"
        />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATEGORY_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={opt.value === accountCategory}
              onPress={() => {
                setAccountCategory(opt.value);
                setAccountCode(suggestCode(accountName, opt.value));
              }}
            />
          ))}
        </View>
      </FormSection>
      <Button
        label="Create"
        loading={saving}
        disabled={saving}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
