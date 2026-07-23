import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ListRow } from '@/components/ListRow';
import { ListScreen, ListScreenHeader } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { fetchDirectors } from '@/directors/api';
import { DirectorStatus } from '@/directors/types';
import { formatDate, formatInr } from '@/format';
import { fetchJournal, resolveJournalCapabilities } from '@/journals';
import type { PublicJournalEntry } from '@/journals/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
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

  return (
    <ListScreen
      title="Expense & income"
      subtitle={
        selectedProject ? selectedProject.projectCode : 'Select a project'
      }
      header={
        !loading && !error && !forbidden ? (
          <ListScreenHeader>
            {journalCaps.canCreate ? (
              <View style={styles.actionBar} testID="project-finance-actions">
                <Button
                  label="Income"
                  onPress={() => openEntry('income')}
                  style={styles.actionBtn}
                />
                <Button
                  label="Expense"
                  onPress={() => openEntry('expense')}
                  style={styles.actionBtn}
                />
                <Button
                  label="Transfer"
                  variant="secondary"
                  onPress={() => openEntry('transfer')}
                  style={styles.actionBtn}
                />
              </View>
            ) : null}

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
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  label={label}
                  selected={filterKind === id}
                  onPress={() => setFilterKind(id)}
                />
              ))}
            </View>
          </ListScreenHeader>
        ) : null
      }
      data={visibleRows}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel={
        filterKind === 'all'
          ? 'No bank/cash entries yet. Use Income, Expense, or Transfer above.'
          : `No ${filterKind} entries yet.`
      }
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={`${financeRowVoucherLabel(item) ?? '—'} · ${financeRowTypeLabel(item)}`}
          meta={`${formatDate(item.journalDate)} · ${item.book} · ${formatInr(item.amount)} · ${item.accountCode} · ${item.narration}`}
          onPress={() =>
            navigation.navigate('JournalDetail', {
              journalId: item.journalId,
            })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionBtn: { flex: 1 },
  summary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1 },
  kpiLabel: { ...typography.label, color: colors.textMuted, fontSize: 11 },
  kpiValue: {
    ...typography.bodyStrong,
    fontSize: 13,
    marginTop: 2,
  },
  breakdown: {
    ...typography.meta,
    fontSize: 11,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
