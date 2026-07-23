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
import { listStockBalances, type StockBalanceRow } from './api';

type Props = NativeStackScreenProps<AppStackParamList, 'StockLedger'>;

export function StockLedgerScreen(_props: Props) {
  const { hasPermission } = useAuth();
  const canView = hasPermission('stock.view');
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<StockBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!canView) {
        setForbidden(true);
        setError('Missing stock.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load stock ledger');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        setItems(await listStockBalances({ projectId: selectedProject.id }));
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load stock ledger'));
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
      title="Stock ledger"
      subtitle={selectedProject?.projectCode ?? 'Select project'}
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No stock rows"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={
            item.materialCode ||
            item.materialName ||
            item.materialId.slice(-6)
          }
          meta={`Qty ${item.quantityInBaseUnit}${item.location ? ` · ${item.location}` : ''}`}
        />
      )}
    />
  );
}
