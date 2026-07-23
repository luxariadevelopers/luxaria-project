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
import { listPettyCashRequirements } from './api';
import { resolvePettyCashCapabilities } from './permissions';
import {
  requestNumberOf,
  type PublicPettyCashRequirement,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PettyCashList'>;

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const s = status.toLowerCase();
  if (s.includes('post') || s.includes('approv') || s === 'paid') return 'success';
  if (s.includes('reject') || s.includes('cancel')) return 'danger';
  if (s.includes('submit') || s.includes('pending') || s.includes('draft'))
    return 'warning';
  return 'default';
}

export function PettyCashListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolvePettyCashCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicPettyCashRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing petty_cash.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load petty cash');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        setItems(
          await listPettyCashRequirements({ projectId: selectedProject.id }),
        );
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load petty cash'));
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
      title="Petty cash"
      subtitle={selectedProject?.projectCode ?? 'Select project'}
      rightSlot={
        caps.canRequest ? (
          <Button
            label="New"
            onPress={() => navigation.navigate('PettyCashForm')}
            style={{ minWidth: 88 }}
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
      emptyLabel="No petty cash requests"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={requestNumberOf(item)}
          meta={`${String(item.weekStartDate).slice(0, 10)} → ${String(item.weekEndDate).slice(0, 10)}`}
          status={item.status}
          statusTone={statusTone(item.status)}
          onPress={() =>
            navigation.navigate('PettyCashDetail', { requestId: item.id })
          }
        />
      )}
    />
  );
}
