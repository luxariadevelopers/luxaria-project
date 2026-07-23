import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
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

        <FormSection title="Petty-cash account">
          {loadingAccounts ? (
            <Text style={styles.hint}>Loading accounts…</Text>
          ) : (
            <View style={styles.chipWrap}>
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={`${a.accountCode} · ${a.accountName}`}
                  selected={a.id === accountId}
                  onPress={() => setAccountId(a.id)}
                  style={styles.chip}
                />
              ))}
            </View>
          )}
        </FormSection>

        <FormSection
          title="Requirement items"
          description="Each category (e.g. Labour) can only appear on one line."
          framed={false}
        >
          <Button
            label="+ Add item"
            variant="ghost"
            disabled={!nextUnusedCategory}
            onPress={() => {
              if (!nextUnusedCategory) return;
              setItems((prev) => [
                ...prev,
                newLine({ expenseCategory: nextUnusedCategory.value }),
              ]);
            }}
            style={styles.addBtn}
          />

          {items.map((row, index) => (
            <FormSection key={row.key} title={`Item ${index + 1}`}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.chipWrap}>
                {CATEGORY_OPTIONS.map((opt) => {
                  const selectedCat = opt.value === row.expenseCategory;
                  const takenByOther =
                    usedCategories.has(opt.value) && !selectedCat;
                  return (
                    <Chip
                      key={opt.value}
                      label={takenByOther ? `${opt.label} (used)` : opt.label}
                      selected={selectedCat}
                      disabled={takenByOther}
                      onPress={() =>
                        updateItem(row.key, { expenseCategory: opt.value })
                      }
                      style={styles.chip}
                    />
                  );
                })}
              </View>
              <TextField
                label="Description"
                value={row.description}
                onChangeText={(v) => updateItem(row.key, { description: v })}
                placeholder="What the cash is for"
              />
              <TextField
                label="Amount"
                value={row.estimatedAmount}
                onChangeText={(v) =>
                  updateItem(row.key, { estimatedAmount: v })
                }
                keyboardType="decimal-pad"
              />
              {items.length > 1 ? (
                <Button
                  label="Remove item"
                  variant="danger"
                  onPress={() =>
                    setItems((prev) => prev.filter((r) => r.key !== row.key))
                  }
                />
              ) : null}
            </FormSection>
          ))}
        </FormSection>

        <Text style={styles.total}>Requested total: {formatInr(total)}</Text>

        <FormSection title="Approval">
          <TextField
            label="Justification (required)"
            value={justification}
            onChangeText={setJustification}
            multiline
            style={styles.multiline}
            placeholder="Why this week’s float is needed — for PM/finance approval"
          />
          <Text style={styles.hint}>
            Required by the server for approval. Line items alone are not
            enough.
          </Text>
        </FormSection>

        <Button
          label="Create & submit"
          loading={saving || loadingAccounts}
          disabled={saving || loadingAccounts}
          onPress={() => void submit()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxxl },
  label: { ...typography.label, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { marginBottom: spacing.xs },
  addBtn: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  total: {
    ...typography.bodyStrong,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  hint: { ...typography.meta, fontSize: 12, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
