import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ListRow } from '@/components/ListRow';
import { ListScreen } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { fetchWorkOrders, type PublicWorkOrder } from '@/work-orders/api';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkOrderList'>;

export function WorkOrderListScreen(_props: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const canView = hasPermission('work_order.view');

  const [items, setItems] = useState<PublicWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!canView) {
        setForbidden(true);
        setError('Missing permission work_order.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Work orders require a network connection to load.');
        setLoading(false);
        return;
      }

      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const result = await fetchWorkOrders({
          projectId: selectedProject.id,
          page: 1,
          limit: 50,
        });
        setItems(result.items);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load work orders'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView, isOnline, selectedProject?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return (
    <ListScreen
      title="Work orders"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · issued / in progress`
          : 'Select a project'
      }
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No work orders for this project"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={item.workOrderNumber}
          meta={`${item.startDate.slice(0, 10)} → ${item.endDate.slice(0, 10)} · value ${Number(item.contractValue).toLocaleString()}`}
          status={item.status.replace(/_/g, ' ')}
        />
      )}
    />
  );
}
