import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatInr, formatPercentage } from '@/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { FormSection } from '@/components/FormSection';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
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
        <AsyncStatePanel
          forbidden
          error="You need dashboard.view or analytics.dashboard.view to open the director command centre."
        />
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
      {summaryQuery.isLoading || summaryQuery.error ? (
        <AsyncStatePanel
          loading={summaryQuery.isLoading}
          error={
            summaryQuery.error
              ? getErrorMessage(summaryQuery.error)
              : null
          }
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : summary && summary.filters.accessibleProjectCount === 0 ? (
        <AsyncStatePanel empty emptyLabel="No projects in scope for this filter." />
      ) : summary ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <FormSection title="Payables & collections">
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
          </FormSection>

          <FormSection title="Cash position">
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
          </FormSection>

          <FormSection title="Critical exceptions" framed={false}>
          {summary.criticalExceptions.length === 0 &&
          summary.materialStockAlerts.count === 0 &&
          summary.labourShortfall.count === 0 ? (
            <Text style={styles.message}>No critical exceptions.</Text>
          ) : null}
          {summary.criticalExceptions.map((ex) => (
            <ListRow
              key={ex.code}
              title={`${ex.severity.toUpperCase()} · ${ex.code}`}
              meta={`${ex.message} · ${ex.count}`}
            />
          ))}
          {summary.materialStockAlerts.count > 0 ? (
            <ListRow
              title="Material stock alerts"
              meta={`${summary.materialStockAlerts.count} alerts`}
            />
          ) : null}
          {summary.labourShortfall.count > 0 ? (
            <ListRow
              title="Labour shortfall"
              meta={`${summary.labourShortfall.count} alerts`}
            />
          ) : null}
          </FormSection>

          <FormSection title="Project bank balances" framed={false}>
          {summary.projectWiseBankBalance.map((row) => (
            <ListRow
              key={`bank-${row.projectId}`}
              title={`${row.projectCode ?? '—'} · ${row.projectName ?? 'Project'}`}
              meta={`Bank ${money(row.amount)}`}
              onPress={
                row.projectId
                  ? () => void openProjectDashboard(row.projectId)
                  : undefined
              }
            />
          ))}
          {summary.projectWiseBankBalance.length === 0 ? (
            <Text style={styles.message}>No project bank rows.</Text>
          ) : null}
          </FormSection>

          <FormSection title="Cost vs budget" framed={false}>
          {summary.costVersusBudget.map((row) => (
            <ListRow
              key={`cvb-${row.projectId}`}
              title={`${row.projectCode ?? '—'} · ${row.projectName ?? 'Project'}`}
              meta={`Budget ${money(row.budgetAmount)} · Actual ${money(row.actualCost)} · Variance ${money(row.variance)} · ${percent(row.utilisationPercent)}`}
              onPress={
                row.projectId
                  ? () => void openProjectDashboard(row.projectId)
                  : undefined
              }
            />
          ))}
          {summary.costVersusBudget.length === 0 ? (
            <Text style={styles.message}>No cost-vs-budget rows.</Text>
          ) : null}
          </FormSection>

          <FormSection title="Physical progress" framed={false}>
          {summary.physicalProgress.map((row) => (
            <ListRow
              key={`prog-${row.projectId}`}
              title={`${row.projectCode ?? '—'} · ${row.projectName ?? 'Project'}`}
              meta={`Progress ${percent(row.progressPercent)} · Measured ${row.measuredQuantity} / ${row.plannedQuantity}`}
              onPress={
                row.projectId
                  ? () => void openProjectDashboard(row.projectId)
                  : undefined
              }
            />
          ))}
          {summary.physicalProgress.length === 0 ? (
            <Text style={styles.message}>No physical progress rows.</Text>
          ) : null}
          </FormSection>

          <FormSection title="BOQ utilisation" framed={false}>
          {summary.boqUtilisation.map((row) => (
            <ListRow
              key={`boq-${row.projectId}`}
              title={`${row.projectCode ?? '—'} · ${row.projectName ?? 'Project'}`}
              meta={`Planned ${money(row.boqPlannedValue)} · Utilised ${percent(row.utilisedQuantityPercent)}`}
              onPress={
                row.projectId
                  ? () => void openProjectDashboard(row.projectId)
                  : undefined
              }
            />
          ))}
          {summary.boqUtilisation.length === 0 ? (
            <Text style={styles.message}>No BOQ utilisation rows.</Text>
          ) : null}
          </FormSection>
        </ScrollView>
      ) : (
        <AsyncStatePanel empty emptyLabel="Command centre summary unavailable." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxxl, gap: spacing.sm },
  message: { ...typography.meta },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  metricLabel: { ...typography.meta, fontSize: 12 },
  metricValue: {
    marginTop: spacing.xs,
    ...typography.bodyStrong,
  },
  metricMeta: { marginTop: 2, fontSize: 11, color: colors.textMuted },
});
