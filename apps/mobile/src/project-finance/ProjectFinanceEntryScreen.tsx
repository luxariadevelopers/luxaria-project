import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  createJournal,
  resolveJournalCapabilities,
  submitJournal,
} from '@/journals';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
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
        options.map((opt) => {
          const selected = opt.id === value;
          return (
            <Pressable
              key={opt.id || '__none'}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(opt.id)}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })
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

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={journalDate}
          onChangeText={setJournalDate}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
        />
        {Number(amount) > 0 ? (
          <Text style={styles.hint}>{formatInr(Number(amount))}</Text>
        ) : null}

        <Text style={styles.label}>Narration</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={narration}
          onChangeText={setNarration}
          multiline
        />

        <View style={styles.row}>
          <Pressable
            style={[styles.tab, bookKind === 'bank' && styles.tabActive]}
            onPress={() => setBookKind('bank')}
          >
            <Text style={styles.tabText}>
              {kind === 'transfer' ? 'From bank' : 'Bank book'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, bookKind === 'cash' && styles.tabActive]}
            onPress={() => setBookKind('cash')}
          >
            <Text style={styles.tabText}>
              {kind === 'transfer' ? 'From cash' : 'Cash book'}
            </Text>
          </Pressable>
        </View>

        <OptionChips
          label={kind === 'transfer' ? 'From account' : 'Book account'}
          options={bookOptions}
          value={bookAccountId}
          onChange={setBookAccountId}
        />

        {kind === 'transfer' ? (
          <View style={styles.row}>
            <Pressable
              style={[styles.tab, toBookKind === 'bank' && styles.tabActive]}
              onPress={() => setToBookKind('bank')}
            >
              <Text style={styles.tabText}>To bank</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, toBookKind === 'cash' && styles.tabActive]}
              onPress={() => setToBookKind('cash')}
            >
              <Text style={styles.tabText}>To cash</Text>
            </Pressable>
          </View>
        ) : null}

        <OptionChips
          label={
            kind === 'transfer'
              ? 'To account'
              : kind === 'income'
                ? 'Income from'
                : 'Expense / payment to'
          }
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

        <View style={styles.quickRow}>
          {kind === 'expense' && caps.canManageAccounts ? (
            <Pressable
              style={styles.linkBtn}
              onPress={() =>
                navigation.navigate('QuickCreateExpenseAccount', {
                  returnKind: 'expense',
                })
              }
            >
              <Text style={styles.linkText}>+ Expense account</Text>
            </Pressable>
          ) : null}
          {kind === 'expense' && caps.canManageCostCentres ? (
            <Pressable
              style={styles.linkBtn}
              onPress={() =>
                navigation.navigate('QuickCreateCostCentre', {
                  returnKind: 'expense',
                })
              }
            >
              <Text style={styles.linkText}>+ Cost centre</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={[styles.btn, saving && styles.disabled]}
          disabled={saving}
          onPress={() => void submit()}
        >
          <Text style={styles.btnText}>
            {saving
              ? 'Saving…'
              : journalCaps.canPost
                ? 'Save & post'
                : 'Save & submit'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  block: { marginBottom: 8 },
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  hint: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  error: { color: colors.danger, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tabActive: { borderColor: colors.primary, backgroundColor: '#E8EEF1' },
  tabText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 6,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: '#E8EEF1' },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextSelected: { fontWeight: '700' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  linkBtn: { paddingVertical: 6 },
  linkText: { color: colors.primary, fontWeight: '700' },
  btn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
