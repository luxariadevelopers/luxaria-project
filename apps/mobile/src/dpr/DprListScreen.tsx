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
import { listDailyProgressReports } from './api';
import type { PublicDailyProgressReport } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'DprList'>;

export function DprListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const canView = hasPermission('dpr.view');
  const canCreate = hasPermission('dpr.create');
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicDailyProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!canView) {
        setForbidden(true);
        setError('Missing dpr.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load DPRs');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        setItems(
          await listDailyProgressReports({ projectId: selectedProject.id }),
        );
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load DPRs'));
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
      title="Daily progress"
      subtitle={selectedProject?.projectCode ?? 'Select project'}
      rightSlot={
        canCreate ? (
          <Button
            label="Capture"
            onPress={() => navigation.navigate('DailyProgressReport')}
            style={{ minWidth: 96 }}
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
      emptyLabel="No DPRs yet"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={item.dprNumber}
          meta={`${String(item.reportDate).slice(0, 10)} · labour ${item.labourCount}`}
          status={item.status}
          onPress={() => navigation.navigate('DprDetail', { dprId: item.id })}
        />
      )}
    />
  );
}
