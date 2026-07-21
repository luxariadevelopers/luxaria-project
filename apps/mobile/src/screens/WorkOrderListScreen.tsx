import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchWorkOrders, type PublicWorkOrder } from '@/work-orders/api';
import {
  EmptyPanel,
  ErrorPanel,
  ForbiddenPanel,
  LoadingPanel,
} from '@/work-measurement/components/StatePanels';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkOrderList'>;

export function WorkOrderListScreen(_props: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const canView = hasPermission('work_order.view');

  const [items, setItems] = useState<PublicWorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!canView) return;
      if (!selectedProject?.id) {
        setItems([]);
        setError(null);
        return;
      }
      if (!isOnline) {
        setError(
          new Error(
            'Work orders require a network connection to load.',
          ),
        );
        return;
      }

      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await fetchWorkOrders({
          projectId: selectedProject.id,
          page: 1,
          limit: 50,
        });
        setItems(result.items);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView, isOnline, selectedProject?.id],
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  if (!canView) {
    return (
      <Screen title="Work orders" subtitle="Assigned scope">
        <ForbiddenPanel message="Missing permission work_order.view" />
      </Screen>
    );
  }

  return (
    <Screen
      title="Work orders"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · issued / in progress`
          : 'Select a project'
      }
      scroll={false}
    >
      {loading ? <LoadingPanel /> : null}
      {error ? (
        <ErrorPanel error={error} onRetry={() => void load('initial')} />
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyPanel
          title="No work orders"
          description="No work orders for this project."
        />
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
            />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.code}>{item.workOrderNumber}</Text>
              <Text style={styles.meta}>
                {item.status.replace(/_/g, ' ')} · value{' '}
                {Number(item.contractValue).toLocaleString()}
              </Text>
              <Text style={styles.dates}>
                {item.startDate.slice(0, 10)} → {item.endDate.slice(0, 10)}
              </Text>
            </View>
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  code: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  dates: { marginTop: 2, fontSize: 12, color: colors.textMuted },
});
