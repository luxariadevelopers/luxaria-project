import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatInr, formatPercentage } from '@/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchDirectorCommandCentreSummary } from './api';
import type { MoneyTile } from './types';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'DirectorCommandCentre'
>;

function money(n?: number | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return formatInr(n);
}

function percent(n?: number | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return formatPercentage(n);
}

function Metric({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {meta ? <Text style={styles.metricMeta}>{meta}</Text> : null}
    </View>
  );
}

function tileMeta(tile?: MoneyTile, countLabel = 'items'): string | undefined {
  if (tile?.count === undefined || tile.count === null) return undefined;
  return `${tile.count} ${countLabel}`;
}

export function DirectorCommandCentreScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { setSelectedProjectId } = useProject();
  const canView =
    hasPermission('dashboard.view') ||
    hasPermission('analytics.dashboard.view');

  const summaryQuery = useQuery({
    queryKey: ['mobile', 'director-command-centre'],
    queryFn: () => fetchDirectorCommandCentreSummary({}),
    enabled: canView,
    staleTime: 60_000,
    retry: false,
  });

  const openProjectDashboard = async (projectId: string) => {
    if (!projectId) return;
    await setSelectedProjectId(projectId);
    navigation.navigate('ProjectDashboard');
  };

  if (!canView) {
    return (
      <Screen title="Command centre" subtitle="Permission required">
        <Text style={styles.message}>
          You need dashboard.view or analytics.dashboard.view to open the
          director command centre.
        </Text>
      </Screen>
    );
  }

  const summary = summaryQuery.data;
  const applied = summary?.filters;

  return (
    <Screen
      title="Command centre"
      subtitle={
        applied
          ? `${applied.accessibleProjectCount} projects${
              applied.financialYearName
                ? ` · ${applied.financialYearName}`
                : ''
            }`
          : 'Executive summary'
      }
      scroll={false}
    >
      {summaryQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : summaryQuery.error ? (
        <Text style={styles.message}>
          {getErrorMessage(summaryQuery.error)}
        </Text>
      ) : summary && summary.filters.accessibleProjectCount === 0 ? (
        <Text style={styles.message}>No projects in scope for this filter.</Text>
      ) : summary ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.section}>Payables & collections</Text>
          <View style={styles.grid}>
            <Metric
              label="Vendor payable"
              value={money(summary.vendorPayable.amount)}
              meta={tileMeta(summary.vendorPayable, 'invoices')}
            />
            <Metric
              label="Contractor payable"
              value={money(summary.contractorPayable.amount)}
              meta={tileMeta(summary.contractorPayable, 'bills')}
            />
            <Metric
              label="Payments due today"
              value={money(summary.paymentsDueToday.amount)}
              meta={tileMeta(summary.paymentsDueToday)}
            />
            <Metric
              label="Overdue payments"
              value={money(summary.overduePayments.amount)}
              meta={tileMeta(summary.overduePayments)}
            />
            <Metric
              label="Customer collections"
              value={money(summary.customerCollections.amount)}
              meta={tileMeta(summary.customerCollections)}
            />
            <Metric
              label="Purchase requests"
              value={money(summary.purchaseRequestsPending.amount)}
              meta={tileMeta(summary.purchaseRequestsPending, 'pending')}
            />
            <Metric
              label="Director contributions"
              value={money(summary.directorContributionSummary.pendingAmount)}
              meta={`${summary.directorContributionSummary.commitmentCount} commitments`}
            />
            <Metric
              label="Investor contributions"
              value={money(summary.investorContributionSummary.pendingAmount)}
              meta={`${summary.investorContributionSummary.commitmentCount} commitments`}
            />
          </View>

          <Text style={styles.section}>Cash position</Text>
          <View style={styles.grid}>
            <Metric
              label="Company bank"
              value={money(summary.totalCompanyBankBalance.amount)}
              meta={tileMeta(summary.totalCompanyBankBalance, 'accounts')}
            />
            <Metric
              label="Cash / petty"
              value={money(summary.totalCashBalance.amount)}
              meta={tileMeta(summary.totalCashBalance, 'accounts')}
            />
          </View>

          <Text style={styles.section}>Critical exceptions</Text>
          {summary.criticalExceptions.length === 0 &&
          summary.materialStockAlerts.count === 0 &&
          summary.labourShortfall.count === 0 ? (
            <Text style={styles.message}>No critical exceptions.</Text>
          ) : null}
          {summary.criticalExceptions.map((ex) => (
            <View key={ex.code} style={styles.card}>
              <Text style={styles.cardTitle}>
                {ex.severity.toUpperCase()} · {ex.code}
              </Text>
              <Text style={styles.cardMeta}>
                {ex.message} · {ex.count}
              </Text>
            </View>
          ))}
          {summary.materialStockAlerts.count > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Material stock alerts</Text>
              <Text style={styles.cardMeta}>
                {summary.materialStockAlerts.count} alerts
              </Text>
            </View>
          ) : null}
          {summary.labourShortfall.count > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Labour shortfall</Text>
              <Text style={styles.cardMeta}>
                {summary.labourShortfall.count} alerts
              </Text>
            </View>
          ) : null}

          <Text style={styles.section}>Project bank balances</Text>
          {summary.projectWiseBankBalance.map((row) => (
            <Pressable
              key={`bank-${row.projectId}`}
              style={styles.card}
              onPress={() => void openProjectDashboard(row.projectId)}
              disabled={!row.projectId}
            >
              <Text style={styles.cardTitle}>
                {row.projectCode ?? '—'} · {row.projectName ?? 'Project'}
              </Text>
              <Text style={styles.cardMeta}>Bank {money(row.amount)}</Text>
              {row.projectId ? (
                <Text style={styles.linkText}>Open project dashboard</Text>
              ) : null}
            </Pressable>
          ))}
          {summary.projectWiseBankBalance.length === 0 ? (
            <Text style={styles.message}>No project bank rows.</Text>
          ) : null}

          <Text style={styles.section}>Cost vs budget</Text>
          {summary.costVersusBudget.map((row) => (
            <Pressable
              key={`cvb-${row.projectId}`}
              style={styles.card}
              onPress={() => void openProjectDashboard(row.projectId)}
              disabled={!row.projectId}
            >
              <Text style={styles.cardTitle}>
                {row.projectCode ?? '—'} · {row.projectName ?? 'Project'}
              </Text>
              <Text style={styles.cardMeta}>
                Budget {money(row.budgetAmount)} · Actual{' '}
                {money(row.actualCost)} · Variance {money(row.variance)} ·{' '}
                {percent(row.utilisationPercent)}
              </Text>
            </Pressable>
          ))}
          {summary.costVersusBudget.length === 0 ? (
            <Text style={styles.message}>No cost-vs-budget rows.</Text>
          ) : null}

          <Text style={styles.section}>Physical progress</Text>
          {summary.physicalProgress.map((row) => (
            <Pressable
              key={`prog-${row.projectId}`}
              style={styles.card}
              onPress={() => void openProjectDashboard(row.projectId)}
              disabled={!row.projectId}
            >
              <Text style={styles.cardTitle}>
                {row.projectCode ?? '—'} · {row.projectName ?? 'Project'}
              </Text>
              <Text style={styles.cardMeta}>
                Progress {percent(row.progressPercent)} · Measured{' '}
                {row.measuredQuantity} / {row.plannedQuantity}
              </Text>
            </Pressable>
          ))}
          {summary.physicalProgress.length === 0 ? (
            <Text style={styles.message}>No physical progress rows.</Text>
          ) : null}

          <Text style={styles.section}>BOQ utilisation</Text>
          {summary.boqUtilisation.map((row) => (
            <Pressable
              key={`boq-${row.projectId}`}
              style={styles.card}
              onPress={() => void openProjectDashboard(row.projectId)}
              disabled={!row.projectId}
            >
              <Text style={styles.cardTitle}>
                {row.projectCode ?? '—'} · {row.projectName ?? 'Project'}
              </Text>
              <Text style={styles.cardMeta}>
                Planned {money(row.boqPlannedValue)} · Utilised{' '}
                {percent(row.utilisedQuantityPercent)}
              </Text>
            </Pressable>
          ))}
          {summary.boqUtilisation.length === 0 ? (
            <Text style={styles.message}>No BOQ utilisation rows.</Text>
          ) : null}
        </ScrollView>
      ) : (
        <Text style={styles.message}>Command centre summary unavailable.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 10, paddingBottom: 32 },
  loader: { marginTop: 40 },
  message: { padding: 16, color: colors.textMuted },
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  metricLabel: { fontSize: 12, color: colors.textMuted },
  metricValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  metricMeta: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardMeta: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  linkText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
