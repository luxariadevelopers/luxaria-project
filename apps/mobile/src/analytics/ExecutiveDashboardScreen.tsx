import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiGet, getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';

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
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-IN');
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
        <Text style={styles.message}>
          You need analytics.dashboard.view to open the executive view.
        </Text>
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
      {query.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : query.error ? (
        <Text style={styles.message}>{getErrorMessage(query.error)}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.section}>Today</Text>
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

          <Text style={styles.section}>Projects</Text>
          {(query.data?.projects ?? []).map((p) => (
            <View key={p.projectId} style={styles.card}>
              <Text style={styles.cardTitle}>
                {p.code ?? '—'} · {p.name ?? 'Project'}
              </Text>
              <Text style={styles.cardMeta}>
                Progress {p.progress ?? 0}% · Margin forecast{' '}
                {money(p.marginForecast ?? undefined)} · {p.health ?? 'n/a'}
              </Text>
            </View>
          ))}
          {(query.data?.projects ?? []).length === 0 ? (
            <Text style={styles.message}>No project KPIs in scope.</Text>
          ) : null}
        </ScrollView>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardMeta: { marginTop: 4, fontSize: 13, color: colors.textMuted },
});
