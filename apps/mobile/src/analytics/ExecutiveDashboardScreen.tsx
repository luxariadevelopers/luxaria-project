import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiGet, getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { FormSection } from '@/components/FormSection';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ExecutiveDashboard'>;

type MobileExecutive = {
  asOf?: string;
  today?: {
    cashAndBank?: number;
    collections?: number;
    paymentsDue?: number;
    criticalAlerts?: number;
    pendingApprovals?: number;
  };
  projects?: Array<{
    projectId: string;
    code?: string | null;
    name?: string | null;
    progress?: number;
    marginForecast?: number | null;
    health?: string;
  }>;
};

function money(n?: number): string {
  return formatInr(n);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function ExecutiveDashboardScreen(_props: Props) {
  const { hasPermission } = useAuth();
  const canView =
    hasPermission('analytics.dashboard.view') ||
    hasPermission('dashboard.view');

  const query = useQuery({
    queryKey: ['mobile', 'executive-dashboard'],
    queryFn: async () => {
      const res = await apiGet<MobileExecutive>('/analytics/mobile/executive');
      if (!res.data) {
        throw new Error(res.message || 'Executive summary unavailable');
      }
      return res.data;
    },
    enabled: canView,
    staleTime: 60_000,
    retry: false,
  });

  if (!canView) {
    return (
      <Screen title="Executive" subtitle="Permission required">
        <AsyncStatePanel
          forbidden
          error="You need analytics.dashboard.view to open the executive view."
        />
      </Screen>
    );
  }

  const today = query.data?.today;

  return (
    <Screen
      title="Executive"
      subtitle={query.data?.asOf ? `As of ${query.data.asOf.slice(0, 10)}` : 'Today'}
      scroll={false}
    >
      {query.isLoading || query.error ? (
        <AsyncStatePanel
          loading={query.isLoading}
          error={query.error ? getErrorMessage(query.error) : null}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <FormSection title="Today">
            <View style={styles.grid}>
              <Metric label="Cash & bank" value={money(today?.cashAndBank)} />
              <Metric label="Collections" value={money(today?.collections)} />
              <Metric label="Payments due" value={money(today?.paymentsDue)} />
              <Metric
                label="Critical alerts"
                value={String(today?.criticalAlerts ?? 0)}
              />
              <Metric
                label="Approvals"
                value={String(today?.pendingApprovals ?? 0)}
              />
            </View>
          </FormSection>

          <FormSection title="Projects" framed={false}>
            {(query.data?.projects ?? []).map((p) => (
              <ListRow
                key={p.projectId}
                title={`${p.code ?? '—'} · ${p.name ?? 'Project'}`}
                meta={`Progress ${p.progress ?? 0}% · Margin forecast ${money(p.marginForecast ?? undefined)} · ${p.health ?? 'n/a'}`}
              />
            ))}
            {(query.data?.projects ?? []).length === 0 ? (
              <Text style={styles.message}>No project KPIs in scope.</Text>
            ) : null}
          </FormSection>
        </ScrollView>
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
});
