import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatInr } from '@/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import {
  fetchFinanceDashboardSummary,
  fetchFinancialYearFilterOptions,
} from './api';
import type { AgeingBuckets, MoneyTile } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'FinanceDashboard'>;

function money(n?: number | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return formatInr(n);
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

function AgeingBlock({
  title,
  ageing,
}: {
  title: string;
  ageing?: AgeingBuckets | null;
}) {
  if (!ageing) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardMeta}>
        Total {money(ageing.total)} · {ageing.count} bills
      </Text>
      <Text style={styles.cardMeta}>
        Current {money(ageing.current)} · 0–30 {money(ageing.d0_30)} · 31–60{' '}
        {money(ageing.d31_60)}
      </Text>
      <Text style={styles.cardMeta}>
        61–90 {money(ageing.d61_90)} · 90+ {money(ageing.d90Plus)}
      </Text>
    </View>
  );
}

export function FinanceDashboardScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { setSelectedProjectId } = useProject();
  const canView = hasPermission('dashboard.view');
  const canListFy = hasPermission('financial_year.view');

  const fyQuery = useQuery({
    queryKey: ['mobile', 'finance-dashboard', 'financial-years'],
    queryFn: fetchFinancialYearFilterOptions,
    enabled: canView && canListFy,
    staleTime: 60_000,
    retry: false,
  });

  const financialYearId = useMemo(() => {
    const rows = fyQuery.data ?? [];
    return rows.find((fy) => fy.isCurrent)?.id ?? rows[0]?.id;
  }, [fyQuery.data]);

  const summaryQuery = useQuery({
    queryKey: ['mobile', 'finance-dashboard', financialYearId ?? 'none'],
    queryFn: () =>
      fetchFinanceDashboardSummary(
        financialYearId ? { financialYearId } : {},
      ),
    enabled: canView && (!canListFy || fyQuery.isFetched),
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
      <Screen title="Finance" subtitle="Permission required">
        <Text style={styles.message}>
          You need dashboard.view to open the finance dashboard.
        </Text>
      </Screen>
    );
  }

  const summary = summaryQuery.data;
  const fyName =
    summary?.filters.financialYearName ??
    fyQuery.data?.find((fy) => fy.id === financialYearId)?.name;

  return (
    <Screen
      title="Finance"
      subtitle={
        fyName
          ? `${fyName} · ${summary?.filters.accessibleProjectCount ?? '—'} projects`
          : 'Liquidity & payables'
      }
      scroll={false}
    >
      {summaryQuery.isLoading || (canListFy && fyQuery.isLoading) ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : summaryQuery.error ? (
        <Text style={styles.message}>{getErrorMessage(summaryQuery.error)}</Text>
      ) : summary && summary.filters.accessibleProjectCount === 0 ? (
        <Text style={styles.message}>No projects in scope for this filter.</Text>
      ) : summary ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.section}>Urgent actions</Text>
          <View style={styles.grid}>
            <Metric
              label="Overdue payments"
              value={money(summary.overduePayments.amount)}
              meta={tileMeta(summary.overduePayments)}
            />
            <Metric
              label="Upcoming payments"
              value={money(summary.upcomingPayments.amount)}
              meta={tileMeta(summary.upcomingPayments)}
            />
            <Metric
              label="Payment approvals"
              value={money(summary.paymentApprovals.amount)}
              meta={tileMeta(summary.paymentApprovals, 'pending')}
            />
            <Metric
              label="Journal errors"
              value={money(summary.journalErrors.amount)}
              meta={tileMeta(summary.journalErrors, 'entries')}
            />
          </View>

          <Text style={styles.section}>Bank & cash</Text>
          <View style={styles.grid}>
            <Metric
              label="Company bank"
              value={money(summary.companyBankBalances.amount)}
              meta={tileMeta(summary.companyBankBalances, 'accounts')}
            />
            <Metric
              label="Cash balances"
              value={money(summary.cashBalances.amount)}
              meta={tileMeta(summary.cashBalances, 'accounts')}
            />
            <Metric
              label="Bank reconciliation"
              value={
                summary.bankReconciliationPending.available
                  ? money(summary.bankReconciliationPending.amount)
                  : '—'
              }
              meta={
                summary.bankReconciliationPending.available
                  ? `${summary.bankReconciliationPending.pendingCount} pending`
                  : summary.bankReconciliationPending.message || 'Unavailable'
              }
            />
          </View>

          <Text style={styles.section}>Payables & receivables</Text>
          <AgeingBlock title="Vendor ageing" ageing={summary.vendorAgeing} />
          <AgeingBlock
            title="Contractor ageing"
            ageing={summary.contractorAgeing}
          />
          <View style={styles.grid}>
            <Metric
              label="Customer receivables"
              value={money(summary.customerReceivables.amount)}
              meta={tileMeta(summary.customerReceivables)}
            />
            <Metric
              label="Director contributions"
              value={money(summary.directorContributionPending.pendingAmount)}
              meta={`${summary.directorContributionPending.commitmentCount} commitments`}
            />
            <Metric
              label="Investor contributions"
              value={money(summary.investorContributionPending.pendingAmount)}
              meta={`${summary.investorContributionPending.commitmentCount} commitments`}
            />
            <Metric
              label="Unsettled petty cash"
              value={money(summary.unsettledPettyCash.amount)}
              meta={tileMeta(summary.unsettledPettyCash)}
            />
          </View>

          <Text style={styles.section}>
            Cash-flow forecast ({summary.cashFlowForecast.horizonDays}d)
          </Text>
          <View style={styles.grid}>
            <Metric
              label="Inflows"
              value={money(summary.cashFlowForecast.totalInflows)}
            />
            <Metric
              label="Outflows"
              value={money(summary.cashFlowForecast.totalOutflows)}
            />
            <Metric label="Net" value={money(summary.cashFlowForecast.net)} />
          </View>

          <Text style={styles.section}>Project fund position</Text>
          {summary.projectFundPosition.map((row) => (
            <Pressable
              key={row.projectId}
              style={styles.card}
              onPress={() => void openProjectDashboard(row.projectId)}
              disabled={!row.projectId}
            >
              <Text style={styles.cardTitle}>
                {row.projectCode ?? '—'} · {row.projectName ?? 'Project'}
              </Text>
              <Text style={styles.cardMeta}>
                Liquidity {money(row.totalLiquidity)} · Net{' '}
                {money(row.netFundPosition)}
              </Text>
              <Text style={styles.cardMeta}>
                Bank {money(row.bankBalance)} · Cash {money(row.cashBalance)} ·
                Vendor {money(row.vendorPayable)} · Contractor{' '}
                {money(row.contractorPayable)}
              </Text>
              {row.projectId ? (
                <Text style={styles.linkText}>Open project dashboard</Text>
              ) : null}
            </Pressable>
          ))}
          {summary.projectFundPosition.length === 0 ? (
            <Text style={styles.message}>No project fund rows in scope.</Text>
          ) : null}
        </ScrollView>
      ) : (
        <Text style={styles.message}>Finance summary unavailable.</Text>
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
