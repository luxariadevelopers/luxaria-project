import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiGet, getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';

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

export function ProjectDashboardScreen(_props: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject, selectedProjectId } = useProject();
  const canView = hasPermission('dashboard.view');

  const dashboardQuery = useQuery({
    queryKey: ['mobile', 'project-dashboard', selectedProjectId],
    queryFn: () => fetchProjectDashboard(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
    retry: false,
  });

  if (!canView) {
    return (
      <Screen title="Project dashboard" subtitle="Permission required">
        <Text style={styles.message}>
          You need dashboard.view to open the project dashboard.
        </Text>
      </Screen>
    );
  }

  if (!selectedProjectId || !selectedProject) {
    return (
      <Screen title="Project dashboard" subtitle="No project selected">
        <Text style={styles.message}>
          Select a project first, then open the dashboard.
        </Text>
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
      {dashboardQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : dashboardQuery.error ? (
        <Text style={styles.message}>
          {isForbiddenError(dashboardQuery.error)
            ? 'You do not have access to this project dashboard.'
            : getErrorMessage(dashboardQuery.error)}
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Status</Text>
            <Text style={styles.cardBody}>
              {summary?.project?.status ?? selectedProject.status ?? '—'}
              {summary?.project?.projectStage
                ? ` · ${summary.project.projectStage}`
                : ''}
            </Text>
          </View>

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
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  scroll: {
    paddingBottom: 24,
    gap: 12,
  },
  message: {
    color: colors.textMuted,
    marginTop: 24,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  cardBody: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
});
