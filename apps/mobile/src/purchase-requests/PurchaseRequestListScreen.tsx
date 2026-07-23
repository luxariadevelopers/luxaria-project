import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { ListScreen } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { listPurchaseRequests } from './api';
import { resolvePurchaseRequestCapabilities } from './permissions';
import type { PublicPurchaseRequest } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PurchaseRequestList'>;

export function PurchaseRequestListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolvePurchaseRequestCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicPurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing purchase.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load purchase requests');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        setItems(
          await listPurchaseRequests({ projectId: selectedProject.id }),
        );
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load PRs'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [caps.canView, isOnline, selectedProject?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return (
    <ListScreen
      title="Purchase requests"
      subtitle={selectedProject?.projectCode ?? 'Select project'}
      rightSlot={
        caps.canRequest ? (
          <Button
            label="New"
            onPress={() => navigation.navigate('PurchaseRequestForm')}
            style={{ minWidth: 72 }}
          />
        ) : null
      }
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No purchase requests"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={item.requestNumber}
          meta={`Due ${String(item.requiredByDate).slice(0, 10)}`}
          status={item.status}
          onPress={() =>
            navigation.navigate('PurchaseRequestDetail', {
              requestId: item.id,
            })
          }
        />
      )}
    />
  );
}
