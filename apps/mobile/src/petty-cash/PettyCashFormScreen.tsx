import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { createPettyCashRequirement, submitPettyCashRequirement } from './api';
import { fetchPettyCashAccounts } from './cashBalanceApi';
import { resolvePettyCashCapabilities } from './permissions';
import {
  CashAccountStatus,
  PettyCashExpenseCategory,
  type PettyCashExpenseCategory as PettyCashExpenseCategoryValue,
  type PublicCashAccount,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PettyCashForm'>;

type RequirementLine = {
  key: string;
  expenseCategory: PettyCashExpenseCategoryValue;
  description: string;
  estimatedAmount: string;
};

const CATEGORY_OPTIONS: {
  value: PettyCashExpenseCategoryValue;
  label: string;
}[] = [
  { value: PettyCashExpenseCategory.Labour, label: 'Labour' },
  { value: PettyCashExpenseCategory.Materials, label: 'Materials' },
  { value: PettyCashExpenseCategory.Travel, label: 'Travel' },
  { value: PettyCashExpenseCategory.Transport, label: 'Transport' },
  { value: PettyCashExpenseCategory.Food, label: 'Food' },
  { value: PettyCashExpenseCategory.Tools, label: 'Tools' },
  { value: PettyCashExpenseCategory.Utilities, label: 'Utilities' },
  { value: PettyCashExpenseCategory.SiteMisc, label: 'Site misc' },
  { value: PettyCashExpenseCategory.Other, label: 'Other' },
];

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

function newLine(
  partial?: Partial<Omit<RequirementLine, 'key'>>,
): RequirementLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    expenseCategory: PettyCashExpenseCategory.Labour,
    description: '',
    estimatedAmount: '',
    ...partial,
  };
}

export function PettyCashFormScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolvePettyCashCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const range = weekRange();
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<PublicCashAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [items, setItems] = useState<RequirementLine[]>([
    newLine({ description: 'Labour cash', estimatedAmount: '1000' }),
  ]);
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isOnline || !selectedProject?.id) {
        setLoadingAccounts(false);
        return;
      }
      let cancelled = false;
      setLoadingAccounts(true);
      void fetchPettyCashAccounts(selectedProject.id)
        .then((rows) => {
          if (cancelled) return;
          const active = rows.filter(
            (a) =>
              a.status === CashAccountStatus.Active ||
              a.status === CashAccountStatus.PendingHandover,
          );
          setAccounts(active);
          setAccountId((prev) => prev || active[0]?.id || '');
          setError(null);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(getErrorMessage(err, 'Could not load petty-cash accounts'));
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingAccounts(false);
        });
      return () => {
        cancelled = true;
      };
    }, [isOnline, selectedProject?.id]),
  );

  const total = useMemo(
    () =>
      items.reduce((sum, row) => {
        const n = Number(row.estimatedAmount);
        return sum + (Number.isFinite(n) && n > 0 ? n : 0);
      }, 0),
    [items],
  );

  const usedCategories = useMemo(
    () => new Set(items.map((row) => row.expenseCategory)),
    [items],
  );

  const nextUnusedCategory = CATEGORY_OPTIONS.find(
    (opt) => !usedCategories.has(opt.value),
  );

  const updateItem = (key: string, patch: Partial<RequirementLine>) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        if (
          patch.expenseCategory &&
          patch.expenseCategory !== row.expenseCategory &&
          prev.some(
            (other) =>
              other.key !== key &&
              other.expenseCategory === patch.expenseCategory,
          )
        ) {
          setError(
            'Each category can only be used once — pick a different category.',
          );
          return row;
        }
        return { ...row, ...patch };
      }),
    );
  };

  if (!caps.canRequest) {
    return (
      <Screen title="New petty cash" subtitle="Permission required">
        <Text style={styles.error}>You need petty_cash.request.</Text>
      </Screen>
    );
  }

  if (!selectedProject?.id) {
    return (
      <Screen title="New petty cash" subtitle="Project required">
        <Text style={styles.error}>Select a project first.</Text>
      </Screen>
    );
  }

  if (!loadingAccounts && accounts.length === 0) {
    return (
      <Screen title="New petty cash" subtitle={selectedProject.projectCode}>
        <Text style={styles.error}>
          No petty-cash account for this project. Create one on web under
          Accounting → Cash accounts, then return here.
        </Text>
      </Screen>
    );
  }

  const submit = async () => {
    if (!isOnline) {
      setError('Requires network');
      return;
    }
    if (!accountId) {
      setError('Select a petty-cash account');
      return;
    }
    if (!justification.trim()) {
      setError('Justification is required for approval');
      return;
    }
    const requirementItems = items.map((row) => ({
      expenseCategory: row.expenseCategory,
      description: row.description.trim(),
      estimatedAmount: Number(row.estimatedAmount),
    }));
    if (
      requirementItems.some(
        (row) => !row.description || !(row.estimatedAmount > 0),
      )
    ) {
      setError('Each item needs category, description and amount > 0');
      return;
    }
    const categories = requirementItems.map((row) => row.expenseCategory);
    if (new Set(categories).size !== categories.length) {
      setError(
        'Each category can only be used once (e.g. Labour cannot repeat).',
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createPettyCashRequirement({
        projectId: selectedProject.id,
        pettyCashAccountId: accountId,
        weekStartDate: range.weekStartDate,
        weekEndDate: range.weekEndDate,
        justification: justification.trim(),
        requirementItems,
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
    <Screen
      title="New petty cash"
      subtitle={`${range.weekStartDate} → ${range.weekEndDate}`}
      scroll={false}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Petty-cash account</Text>
        {loadingAccounts ? (
          <Text style={styles.hint}>Loading accounts…</Text>
        ) : (
          accounts.map((a) => {
            const selectedRow = a.id === accountId;
            return (
              <Pressable
                key={a.id}
                style={[styles.chip, selectedRow && styles.chipActive]}
                onPress={() => setAccountId(a.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedRow && styles.chipTextActive,
                  ]}
                >
                  {a.accountCode} · {a.accountName}
                </Text>
              </Pressable>
            );
          })
        )}

        <View style={styles.rowBetween}>
          <Text style={styles.section}>Requirement items</Text>
          <Pressable
            disabled={!nextUnusedCategory}
            onPress={() => {
              if (!nextUnusedCategory) return;
              setItems((prev) => [
                ...prev,
                newLine({ expenseCategory: nextUnusedCategory.value }),
              ]);
            }}
            style={[styles.addBtn, !nextUnusedCategory && styles.disabled]}
          >
            <Text style={styles.addBtnText}>+ Add item</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Each category (e.g. Labour) can only appear on one line.
        </Text>

        {items.map((row, index) => (
          <View key={row.key} style={styles.itemCard}>
            <Text style={styles.itemTitle}>Item {index + 1}</Text>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipWrap}>
              {CATEGORY_OPTIONS.map((opt) => {
                const selectedCat = opt.value === row.expenseCategory;
                const takenByOther =
                  usedCategories.has(opt.value) && !selectedCat;
                return (
                  <Pressable
                    key={opt.value}
                    disabled={takenByOther}
                    style={[
                      styles.chip,
                      selectedCat && styles.chipActive,
                      takenByOther && styles.chipDisabled,
                    ]}
                    onPress={() =>
                      updateItem(row.key, { expenseCategory: opt.value })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedCat && styles.chipTextActive,
                        takenByOther && styles.chipTextDisabled,
                      ]}
                    >
                      {opt.label}
                      {takenByOther ? ' (used)' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={row.description}
              onChangeText={(v) => updateItem(row.key, { description: v })}
              placeholder="What the cash is for"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={row.estimatedAmount}
              onChangeText={(v) =>
                updateItem(row.key, { estimatedAmount: v })
              }
              keyboardType="decimal-pad"
            />
            {items.length > 1 ? (
              <Pressable
                onPress={() =>
                  setItems((prev) => prev.filter((r) => r.key !== row.key))
                }
                style={styles.removeBtn}
              >
                <Text style={styles.removeText}>Remove item</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <Text style={styles.total}>
          Requested total: {formatInr(total)}
        </Text>

        <Text style={styles.label}>Justification (required)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={justification}
          onChangeText={setJustification}
          multiline
          placeholder="Why this week’s float is needed — for PM/finance approval"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>
          Required by the server for approval. Line items alone are not enough.
        </Text>

        <Pressable
          style={[styles.submit, (saving || loadingAccounts) && styles.disabled]}
          disabled={saving || loadingAccounts}
          onPress={() => void submit()}
        >
          <Text style={styles.submitText}>
            {saving ? 'Saving…' : 'Create & submit'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  section: {
    color: colors.text,
    fontWeight: '700',
    marginTop: 16,
    fontSize: 15,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  addBtnText: { color: colors.primary, fontWeight: '700' },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    marginTop: 10,
  },
  itemTitle: { color: colors.text, fontWeight: '700', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    marginBottom: 6,
    marginRight: 6,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: '#E8EEF1' },
  chipDisabled: { opacity: 0.45 },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { fontWeight: '700' },
  chipTextDisabled: { color: colors.textMuted },
  removeBtn: { marginTop: 10 },
  removeText: { color: colors.danger, fontWeight: '600' },
  total: {
    marginTop: 12,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
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
