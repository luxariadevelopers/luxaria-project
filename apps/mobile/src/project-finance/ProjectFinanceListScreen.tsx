import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { fetchDirectors } from '@/directors/api';
import { DirectorStatus } from '@/directors/types';
import { formatDate, formatInr } from '@/format';
import { fetchJournal, resolveJournalCapabilities } from '@/journals';
import type { PublicJournalEntry } from '@/journals/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchCashBankBook, fetchFinancialYearOptions } from './api';
import { resolveProjectFinanceCapabilities } from './permissions';
import {
  consolidateTransferFinanceRows,
  expandShareCapitalByDirector,
  financeRowTypeLabel,
  financeRowVoucherLabel,
  mapBookRowsToFinanceRows,
  mergeProjectFinanceRows,
  summariseFinanceRows,
  type ProjectFinanceEntryKind,
  type ProjectFinanceRow,
} from './projectExpenseIncome';

type Props = NativeStackScreenProps<AppStackParamList, 'ProjectFinanceList'>;
type FilterKind = 'all' | 'income' | 'expense' | 'transfer';

export function ProjectFinanceListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveProjectFinanceCapabilities(hasPermission);
  const journalCaps = resolveJournalCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [rows, setRows] = useState<ProjectFinanceRow[]>([]);
  const [filterKind, setFilterKind] = useState<FilterKind>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Need project.view and report.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load expense & income');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const fys = await fetchFinancialYearOptions();
        const fyId =
          fys.find((fy) => fy.isCurrent)?.id ?? fys[0]?.id ?? '';
        if (!fyId) {
          setError('No financial year available');
          setRows([]);
          return;
        }
        const bookQuery = {
          projectId: selectedProject.id,
          financialYearId: fyId,
        };
        const [bank, cash, companyBank] = await Promise.all([
          fetchCashBankBook('bank-book', bookQuery),
          fetchCashBankBook('cash-book', bookQuery),
          // Company bank (no project) — share capital receipts live here.
          fetchCashBankBook('bank-book', { financialYearId: fyId }),
        ]);

        const companyCapitalBankRows = mapBookRowsToFinanceRows(
          companyBank.rows,
          'bank',
          { includeCompanyCapitalOnly: true },
        );
        const capitalJournalIds = [
          ...new Set(
            companyCapitalBankRows.map((row) => row.journalId).filter(Boolean),
          ),
        ];

        const journalsById = new Map<string, PublicJournalEntry>();
        if (capitalJournalIds.length > 0) {
          const journals = await Promise.all(
            capitalJournalIds.map((id) =>
              fetchJournal(id).catch(() => null),
            ),
          );
          for (const journal of journals) {
            if (journal) journalsById.set(journal.id, journal);
          }
        }

        const directorNamesById = new Map<string, string>();
        if (capitalJournalIds.length > 0 && hasPermission('director.view')) {
          try {
            const directors = await fetchDirectors({
              page: 1,
              limit: 100,
              status: DirectorStatus.Active,
            });
            for (const director of directors.items) {
              directorNamesById.set(director.id, director.fullName);
            }
          } catch {
            // Director names are optional labels for capital rows.
          }
        }

        const companyCapital = expandShareCapitalByDirector(
          companyCapitalBankRows,
          journalsById,
          directorNamesById,
        );

        const merged = consolidateTransferFinanceRows(
          mergeProjectFinanceRows(
            companyCapital,
            mapBookRowsToFinanceRows(bank.rows, 'bank', {
              excludeCompanyCapital: true,
            }),
            mapBookRowsToFinanceRows(cash.rows, 'cash', {
              excludeCompanyCapital: true,
            }),
          ),
        );
        setRows(merged);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load register'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [caps.canView, hasPermission, isOnline, selectedProject?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  const summary = useMemo(() => summariseFinanceRows(rows), [rows]);
  const visibleRows = useMemo(() => {
    if (filterKind === 'all') return rows;
    return rows.filter((row) => row.kind === filterKind);
  }, [filterKind, rows]);

  const openEntry = (kind: ProjectFinanceEntryKind) => {
    navigation.navigate('ProjectFinanceEntry', { kind });
  };

  const showList = !loading && !error && !forbidden;

  return (
    <Screen
      title="Expense & income"
      subtitle={
        selectedProject ? selectedProject.projectCode : 'Select a project'
      }
      scroll={false}
    >
      {journalCaps.canCreate ? (
        <View style={styles.actionBar} testID="project-finance-actions">
          <Pressable
            style={styles.actionBtn}
            onPress={() => openEntry('income')}
            accessibilityRole="button"
            accessibilityLabel="Add income"
          >
            <Text style={styles.actionBtnText}>Income</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => openEntry('expense')}
            accessibilityRole="button"
            accessibilityLabel="Add expense"
          >
            <Text style={styles.actionBtnText}>Expense</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnTransfer]}
            onPress={() => openEntry('transfer')}
            accessibilityRole="button"
            accessibilityLabel="Add transfer"
          >
            <Text style={styles.actionBtnText}>Transfer</Text>
          </Pressable>
        </View>
      ) : null}

      {loading || error || forbidden ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={false}
          emptyLabel="No bank/cash entries yet"
          onRetry={() => void load('initial')}
        />
      ) : null}

      {showList ? (
        <>
          <View style={styles.summary}>
            <View style={styles.kpiRow}>
              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>Income</Text>
                <Text style={styles.kpiValue}>
                  {formatInr(summary.income)}
                </Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>Expense</Text>
                <Text style={styles.kpiValue}>
                  {formatInr(summary.expense)}
                </Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiLabel}>Net</Text>
                <Text style={styles.kpiValue}>{formatInr(summary.net)}</Text>
              </View>
            </View>
            <Text style={styles.breakdown}>
              Capital {formatInr(summary.capitalIncome)} · Loans{' '}
              {formatInr(summary.loanIncome)} · Other{' '}
              {formatInr(summary.otherIncome)}
            </Text>
          </View>

          <View style={styles.filters}>
            {(
              [
                ['all', 'All'],
                ['income', 'Income'],
                ['expense', 'Expense'],
                ['transfer', 'Transfer'],
              ] as const
            ).map(([id, label]) => {
              const selected = filterKind === id;
              return (
                <Pressable
                  key={id}
                  style={[styles.filterChip, selected && styles.filterSelected]}
                  onPress={() => setFilterKind(id)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.filterTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            data={visibleRows}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                No {filterKind === 'all' ? 'bank/cash' : filterKind} entries yet.
                Use Income, Expense, or Transfer above.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  navigation.navigate('JournalDetail', {
                    journalId: item.journalId,
                  })
                }
              >
                <Text style={styles.code}>
                  {financeRowVoucherLabel(item) ?? '—'} ·{' '}
                  {financeRowTypeLabel(item)}
                </Text>
                <Text style={styles.meta}>
                  {formatDate(item.journalDate)} · {item.book} ·{' '}
                  {formatInr(item.amount)}
                </Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {item.accountCode} · {item.narration}
                </Text>
              </Pressable>
            )}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 4,
  },
  actionBtnTransfer: {
    backgroundColor: '#1B3A4B',
  },
  actionBtnText: {
    color: '#F4F0E6',
    fontWeight: '700',
    fontSize: 14,
  },
  summary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 12,
  },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1 },
  kpiLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  kpiValue: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 2 },
  breakdown: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 10,
    lineHeight: 16,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  filterSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  filterTextSelected: { color: '#F4F0E6' },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  code: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
