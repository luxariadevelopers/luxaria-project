import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatInr } from '@luxaria/shared-format';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiGet, getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import type { CapitalPlanSummary } from '@/projects/types';
import { colors, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ProjectDashboard'>;

type ProjectDashboardSummary = {
  project?: {
    projectCode?: string;
    projectName?: string;
    status?: string;
    projectStage?: string;
  };
  pendingApprovalsCount?: number;
  pendingPoCount?: number;
  pendingGrnCount?: number;
  physicalCompletion?: { percent?: number };
  financialCompletion?: { percent?: number };
  approvedBudget?: { amount?: number };
  actualCost?: { amount?: number };
  dprStatusSummary?: {
    draft?: number;
    submitted?: number;
    reviewed?: number;
    reopened?: number;
    other?: number;
  };
  capitalPlan?: CapitalPlanSummary;
};

async function fetchProjectDashboard(
  projectId: string,
): Promise<ProjectDashboardSummary> {
  const res = await apiGet<ProjectDashboardSummary>(
    `/projects/${projectId}/dashboard`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Dashboard unavailable');
  }
  return res.data;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(2)}%`;
}

function CapitalPlanBlock({
  plan,
  loading,
  canEdit,
  onEdit,
}: {
  plan: CapitalPlanSummary | undefined;
  loading: boolean;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const directors = plan?.directors ?? [];
  const investors = plan?.investors ?? [];

  return (
    <View testID="capital-plan-section">
    <FormSection title="Capital plan" framed={false} style={styles.capitalSection}>
      {canEdit ? (
        <Button
          label="Edit capital plan"
          variant="secondary"
          onPress={onEdit}
          style={styles.capitalEdit}
        />
      ) : null}

      <View style={styles.grid}>
        <Metric
          label="Invested till now"
          value={
            loading || plan == null ? '—' : formatInr(plan.totalInvested)
          }
        />
        <Metric
          label="Pending vs budget"
          value={
            loading || plan == null ? '—' : formatInr(plan.pendingToInvest)
          }
        />
        <Metric
          label="Approved budget"
          value={
            loading || plan == null ? '—' : formatInr(plan.approvedBudget)
          }
        />
      </View>

      {!loading && plan ? (
        <Text style={styles.equalNote}>
          {directors.length < 2
            ? 'Add director capital participants to track equal funding.'
            : plan.directorsEqual
              ? plan.equalDirectorInvestment
                ? 'Director expected investments are equal (equal-investment plan is on).'
                : 'Director expected investments happen to be equal.'
              : plan.equalDirectorInvestment
                ? 'Equal-investment plan is on, but expected amounts are not equal.'
                : 'Director expected investments are not equal.'}
        </Text>
      ) : null}

      {!loading && directors.length > 0
        ? directors.map((row) => (
            <View key={row.participantRecordId} style={styles.partyCard}>
              <Text style={styles.partyName}>{row.name}</Text>
              <Text style={styles.partyMeta}>
                Profit {formatPercent(row.profitSharePercent)} · Expected{' '}
                {formatInr(row.expectedAmount)}
              </Text>
              <Text style={styles.partyMeta}>
                Invested {formatInr(row.investedAmount)} · Still{' '}
                {formatInr(row.pendingAmount)}
              </Text>
            </View>
          ))
        : null}

      {!loading && investors.length > 0 ? (
        <>
          <Text style={styles.subTitle}>Investors</Text>
          {investors.map((row) => (
            <View key={row.participantRecordId} style={styles.partyCard}>
              <Text style={styles.partyName}>{row.name}</Text>
              <Text style={styles.partyMeta}>
                Budget {formatPercent(row.budgetPercent)} · Profit{' '}
                {formatPercent(row.profitSharePercent)}
              </Text>
              <Text style={styles.partyMeta}>
                Expected {formatInr(row.expectedAmount)} · Invested{' '}
                {formatInr(row.investedAmount)} · Still{' '}
                {formatInr(row.pendingAmount)}
              </Text>
              {row.repayHint ? (
                <Text style={styles.partyMeta}>{row.repayHint}</Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}

      {!loading &&
      plan &&
      directors.length === 0 &&
      investors.length === 0 ? (
        <Text style={styles.equalNote}>
          No capital participants yet. Set directors (and optional investors)
          on the capital plan.
        </Text>
      ) : null}
    </FormSection>
    </View>
  );
}

export function ProjectDashboardScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject, selectedProjectId } = useProject();
  const canView = hasPermission('dashboard.view');
  const canEditCapital =
    hasPermission('project.update') ||
    hasPermission('project_participant.create') ||
    hasPermission('project_participant.update');

  const dashboardQuery = useQuery({
    queryKey: ['mobile', 'project-dashboard', selectedProjectId],
    queryFn: () => fetchProjectDashboard(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
    retry: false,
  });

  if (!canView) {
    return (
      <Screen title="Project dashboard" subtitle="Permission required">
        <AsyncStatePanel
          forbidden
          error="You need dashboard.view to open the project dashboard."
        />
      </Screen>
    );
  }

  if (!selectedProjectId || !selectedProject) {
    return (
      <Screen title="Project dashboard" subtitle="No project selected">
        <AsyncStatePanel
          empty
          emptyLabel="Select a project first, then open the dashboard."
        />
      </Screen>
    );
  }

  const summary = dashboardQuery.data;

  return (
    <Screen
      title="Project dashboard"
      subtitle={`${selectedProject.projectCode} · ${selectedProject.projectName}`}
      scroll={false}
    >
      {dashboardQuery.isLoading || dashboardQuery.error ? (
        <AsyncStatePanel
          loading={dashboardQuery.isLoading}
          forbidden={
            Boolean(dashboardQuery.error) &&
            isForbiddenError(dashboardQuery.error)
          }
          error={
            dashboardQuery.error
              ? isForbiddenError(dashboardQuery.error)
                ? 'You do not have access to this project dashboard.'
                : getErrorMessage(dashboardQuery.error)
              : null
          }
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <FormSection title="Status">
            <Text style={styles.cardBody}>
              {summary?.project?.status ?? selectedProject.status ?? '—'}
              {summary?.project?.projectStage
                ? ` · ${summary.project.projectStage}`
                : ''}
            </Text>
          </FormSection>

          <FormSection title="Snapshot">
            <View style={styles.grid}>
              <Metric
                label="Pending approvals"
                value={String(summary?.pendingApprovalsCount ?? 0)}
              />
              <Metric
                label="Pending POs"
                value={String(summary?.pendingPoCount ?? 0)}
              />
              <Metric
                label="Pending GRNs"
                value={String(summary?.pendingGrnCount ?? 0)}
              />
              <Metric
                label="Physical %"
                value={`${summary?.physicalCompletion?.percent ?? 0}%`}
              />
              <Metric
                label="Financial %"
                value={`${summary?.financialCompletion?.percent ?? 0}%`}
              />
              <Metric
                label="DPR submitted"
                value={String(summary?.dprStatusSummary?.submitted ?? 0)}
              />
            </View>
          </FormSection>

          <CapitalPlanBlock
            plan={summary?.capitalPlan}
            loading={dashboardQuery.isFetching && !summary?.capitalPlan}
            canEdit={canEditCapital}
            onEdit={() => navigation.navigate('ProjectCapitalPlan')}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  cardBody: {
    ...typography.bodyStrong,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    width: '47%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  metricLabel: {
    ...typography.meta,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  metricValue: {
    ...typography.bodyStrong,
    fontSize: 18,
  },
  capitalSection: {
    marginTop: spacing.xs,
  },
  capitalEdit: {
    marginBottom: spacing.sm,
  },
  equalNote: {
    ...typography.meta,
    fontSize: 13,
    lineHeight: 18,
  },
  subTitle: {
    ...typography.bodyStrong,
    marginTop: spacing.xs,
  },
  partyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  partyName: { ...typography.bodyStrong, marginBottom: spacing.xs },
  partyMeta: { ...typography.meta, fontSize: 13, marginTop: 2 },
});
