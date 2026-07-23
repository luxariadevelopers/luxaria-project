import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import {
  createJournal,
  resolveJournalCapabilities,
  submitJournal,
} from '@/journals';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import { fetchBookAccounts, fetchCostCentres, fetchAccounts } from './api';
import { resolveProjectFinanceCapabilities } from './permissions';
import {
  buildProjectFinanceJournal,
  buildProjectTransferJournal,
  expenseAccountOptionLabel,
  incomeAccountOptionLabel,
  resolveExpenseFundingSource,
  resolveIncomeFundingSource,
  type ProjectCashBookKind,
  type ProjectFinanceEntryKind,
} from './projectExpenseIncome';
import {
  AccountCategory,
  type PublicAccount,
  type PublicCostCentre,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'ProjectFinanceEntry'>;

const INCOME_CATEGORIES = [
  AccountCategory.Loan,
  AccountCategory.DirectorAccount,
  AccountCategory.InvestorAccount,
  AccountCategory.Sales,
  AccountCategory.OtherIncome,
];

const EXPENSE_CATEGORIES = [
  AccountCategory.DirectorAccount,
  AccountCategory.InvestorAccount,
  AccountCategory.Loan,
  AccountCategory.Interest,
  AccountCategory.LandCost,
  AccountCategory.MaterialPurchase,
  AccountCategory.DirectExpense,
  AccountCategory.IndirectExpense,
  AccountCategory.WorkInProgress,
];

function OptionChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      {options.length === 0 ? (
        <Text style={styles.hint}>No options loaded</Text>
      ) : (
        <View style={styles.chipWrap}>
          {options.map((opt) => (
            <Chip
              key={opt.id || '__none'}
              label={opt.label}
              selected={opt.id === value}
              onPress={() => onChange(opt.id)}
              style={styles.chip}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function ProjectFinanceEntryScreen({ navigation, route }: Props) {
  const kind: ProjectFinanceEntryKind = route.params?.kind ?? 'expense';
  const createdAccountId = route.params?.createdAccountId;
  const createdCostCentreId = route.params?.createdCostCentreId;

  const { hasPermission } = useAuth();
  const caps = resolveProjectFinanceCapabilities(hasPermission);
  const journalCaps = resolveJournalCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();

  const [bookKind, setBookKind] = useState<ProjectCashBookKind>('bank');
  const [toBookKind, setToBookKind] = useState<ProjectCashBookKind>('cash');
  const [bookAccounts, setBookAccounts] = useState<PublicAccount[]>([]);
  const [toBookAccounts, setToBookAccounts] = useState<PublicAccount[]>([]);
  const [contraAccounts, setContraAccounts] = useState<PublicAccount[]>([]);
  const [costCentres, setCostCentres] = useState<PublicCostCentre[]>([]);
  const [bookAccountId, setBookAccountId] = useState('');
  const [contraAccountId, setContraAccountId] = useState('');
  const [costCentreId, setCostCentreId] = useState('');
  const [journalDate, setJournalDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState(
    kind === 'income'
      ? 'Project bank/cash income'
      : kind === 'transfer'
        ? 'Project bank/cash transfer'
        : 'Project bank/cash expense',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLookups = useCallback(async () => {
    if (!isOnline || !selectedProject?.id) return;
    try {
      const bookPromise = fetchBookAccounts(bookKind);
      const costCentrePromise =
        kind === 'expense'
          ? fetchCostCentres({ projectId: selectedProject.id })
          : Promise.resolve([] as PublicCostCentre[]);
      const [book, costCentreRows] = await Promise.all([
        bookPromise,
        costCentrePromise,
      ]);
      setBookAccounts(book);
      setCostCentres(costCentreRows);
      if (!bookAccountId && book[0]) setBookAccountId(book[0].id);

      if (kind === 'transfer') {
        const toBook = await fetchBookAccounts(toBookKind);
        setToBookAccounts(toBook);
        if (!contraAccountId && toBook[0]) setContraAccountId(toBook[0].id);
      } else {
        const categories =
          kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        const lists = await Promise.all(
          categories.map((cat) => fetchAccounts({ accountCategory: cat })),
        );
        const merged = lists.flat();
        const byId = new Map(merged.map((a) => [a.id, a]));
        setContraAccounts([...byId.values()]);
        if (!contraAccountId && merged[0]) {
          setContraAccountId(merged[0].id);
        }
      }
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load accounts'));
    }
  }, [
    bookAccountId,
    bookKind,
    contraAccountId,
    isOnline,
    kind,
    selectedProject?.id,
    toBookKind,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadLookups();
    }, [loadLookups]),
  );

  useEffect(() => {
    if (createdAccountId) {
      setContraAccountId(createdAccountId);
      void loadLookups();
    }
  }, [createdAccountId, loadLookups]);

  useEffect(() => {
    if (createdCostCentreId) {
      setCostCentreId(createdCostCentreId);
      void loadLookups();
    }
  }, [createdCostCentreId, loadLookups]);

  const bookOptions = useMemo(
    () =>
      bookAccounts.map((a) => ({
        id: a.id,
        label: `${a.accountCode} · ${a.accountName}`,
      })),
    [bookAccounts],
  );

  const contraOptions = useMemo(() => {
    if (kind === 'transfer') {
      return toBookAccounts.map((a) => ({
        id: a.id,
        label: `${a.accountCode} · ${a.accountName}`,
      }));
    }
    return contraAccounts.map((a) => ({
      id: a.id,
      label:
        kind === 'income'
          ? incomeAccountOptionLabel(a)
          : expenseAccountOptionLabel(a),
    }));
  }, [contraAccounts, kind, toBookAccounts]);

  const costCentreOptions = useMemo(
    () => [
      { id: '', label: 'None (optional)' },
      ...costCentres.map((c) => ({
        id: c.id,
        label: `${c.code} · ${c.name}`,
      })),
    ],
    [costCentres],
  );

  if (!journalCaps.canCreate) {
    return (
      <Screen title="Project finance" subtitle="Permission required">
        <Text style={styles.error}>You need journal.create.</Text>
      </Screen>
    );
  }

  const title =
    kind === 'income'
      ? 'Add income'
      : kind === 'transfer'
        ? 'Add transfer'
        : 'Add expense';

  const submit = async () => {
    if (!selectedProject?.id) {
      setError('Select a project first');
      return;
    }
    if (!isOnline) {
      setError('Go online to post project finance');
      return;
    }
    const n = Number(amount);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(journalDate) ||
      !(n > 0) ||
      !bookAccountId ||
      !contraAccountId ||
      !narration.trim()
    ) {
      setError('Date, amount, accounts and narration are required');
      return;
    }
    if (kind === 'transfer' && bookAccountId === contraAccountId) {
      setError('From and To accounts must differ');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload =
        kind === 'transfer'
          ? buildProjectTransferJournal(
              {
                projectId: selectedProject.id,
                journalDate,
                amount: n,
                narration: narration.trim(),
                fromAccountId: bookAccountId,
                toAccountId: contraAccountId,
              },
              { post: journalCaps.canPost },
            )
          : buildProjectFinanceJournal(
              {
                projectId: selectedProject.id,
                journalDate,
                amount: n,
                narration: narration.trim(),
                bookAccountId,
                contraAccountId,
                kind,
                costCentreId:
                  kind === 'expense' && costCentreId ? costCentreId : null,
                fundingSource:
                  kind === 'income'
                    ? resolveIncomeFundingSource(
                        contraAccounts.find((a) => a.id === contraAccountId)
                          ?.accountCategory,
                      )
                    : resolveExpenseFundingSource(
                        contraAccounts.find((a) => a.id === contraAccountId)
                          ?.accountCategory,
                      ),
              },
              { post: journalCaps.canPost },
            );

      let journal = await createJournal(payload);
      if (!journalCaps.canPost) {
        journal = await submitJournal(journal.id);
      }
      Alert.alert(
        'Saved',
        `${journal.journalNumber}${
          journalCaps.canPost ? '' : ' (submitted for posting)'
        }`,
      );
      navigation.replace('JournalDetail', { journalId: journal.id });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save entry'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={title} subtitle={selectedProject?.projectCode} scroll={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FormSection title="Entry">
          <TextField
            label="Date (YYYY-MM-DD)"
            value={journalDate}
            onChangeText={setJournalDate}
            autoCapitalize="none"
          />
          <TextField
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          {Number(amount) > 0 ? (
            <Text style={styles.hint}>{formatInr(Number(amount))}</Text>
          ) : null}
          <TextField
            label="Narration"
            value={narration}
            onChangeText={setNarration}
            multiline
            style={styles.multiline}
          />
        </FormSection>

        <FormSection title={kind === 'transfer' ? 'From book' : 'Book'}>
          <View style={styles.row}>
            <Chip
              label={kind === 'transfer' ? 'From bank' : 'Bank book'}
              selected={bookKind === 'bank'}
              onPress={() => setBookKind('bank')}
              style={styles.tab}
            />
            <Chip
              label={kind === 'transfer' ? 'From cash' : 'Cash book'}
              selected={bookKind === 'cash'}
              onPress={() => setBookKind('cash')}
              style={styles.tab}
            />
          </View>
          <OptionChips
            label={kind === 'transfer' ? 'From account' : 'Book account'}
            options={bookOptions}
            value={bookAccountId}
            onChange={setBookAccountId}
          />
        </FormSection>

        {kind === 'transfer' ? (
          <FormSection title="To book">
            <View style={styles.row}>
              <Chip
                label="To bank"
                selected={toBookKind === 'bank'}
                onPress={() => setToBookKind('bank')}
                style={styles.tab}
              />
              <Chip
                label="To cash"
                selected={toBookKind === 'cash'}
                onPress={() => setToBookKind('cash')}
                style={styles.tab}
              />
            </View>
          </FormSection>
        ) : null}

        <FormSection
          title={
            kind === 'transfer'
              ? 'To account'
              : kind === 'income'
                ? 'Income from'
                : 'Expense / payment to'
          }
        >
          <OptionChips
            label="Account"
            options={contraOptions}
            value={contraAccountId}
            onChange={setContraAccountId}
          />
          {kind === 'expense' ? (
            <OptionChips
              label="Cost centre (optional)"
              options={costCentreOptions}
              value={costCentreId}
              onChange={setCostCentreId}
            />
          ) : null}
        </FormSection>

        {kind === 'expense' &&
        (caps.canManageAccounts || caps.canManageCostCentres) ? (
          <FormSection title="Quick create" framed={false}>
            <View style={styles.quickRow}>
              {caps.canManageAccounts ? (
                <Button
                  label="+ Expense account"
                  variant="ghost"
                  onPress={() =>
                    navigation.navigate('QuickCreateExpenseAccount', {
                      returnKind: 'expense',
                    })
                  }
                />
              ) : null}
              {caps.canManageCostCentres ? (
                <Button
                  label="+ Cost centre"
                  variant="ghost"
                  onPress={() =>
                    navigation.navigate('QuickCreateCostCentre', {
                      returnKind: 'expense',
                    })
                  }
                />
              ) : null}
            </View>
          </FormSection>
        ) : null}

        <Button
          label={journalCaps.canPost ? 'Save & post' : 'Save & submit'}
          loading={saving}
          disabled={saving}
          onPress={() => void submit()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxxl },
  block: { marginBottom: spacing.sm },
  label: { ...typography.label, marginBottom: spacing.sm },
  hint: { ...typography.meta, marginTop: spacing.xs, fontSize: 13 },
  error: { color: colors.danger, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { marginBottom: spacing.xs },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
