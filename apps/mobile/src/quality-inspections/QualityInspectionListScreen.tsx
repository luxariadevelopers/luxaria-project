import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ListRow } from '@/components/ListRow';
import { ListScreen } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import {
  completeQualityInspection,
  listQualityInspections,
  type PublicQualityInspection,
} from './api';

type Props = NativeStackScreenProps<AppStackParamList, 'QualityInspectionList'>;

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const value = status.toLowerCase();
  if (value === 'completed' || value === 'accepted') return 'success';
  if (value === 'rejected' || value === 'failed') return 'danger';
  if (value === 'pending' || value === 'in_progress') return 'warning';
  return 'default';
}

export function QualityInspectionListScreen(_props: Props) {
  const { hasPermission } = useAuth();
  const canView = hasPermission('quality.view');
  const canInspect = hasPermission('quality.inspect');
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicQualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!canView) {
        setForbidden(true);
        setError('Missing quality.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load quality inspections');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        setItems(await listQualityInspections({ projectId: selectedProject.id }));
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load inspections'));
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
      title="Quality inspections"
      subtitle={selectedProject?.projectCode ?? 'Select project'}
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No inspections"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => {
        const completed =
          String(item.status).toLowerCase() === 'completed';
        return (
          <ListRow
            title={item.inspectionNumber || item.id.slice(-8)}
            meta={
              item.goodsReceiptId
                ? `GRN ${item.goodsReceiptId.slice(-6)}`
                : undefined
            }
            status={item.status}
            statusTone={statusTone(String(item.status))}
            onPress={
              canInspect && !completed
                ? () => {
                    Alert.alert(
                      'Complete inspection',
                      item.inspectionNumber || item.id,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Complete',
                          onPress: () => {
                            void completeQualityInspection(item.id)
                              .then(() => void load('refresh'))
                              .catch((err) =>
                                Alert.alert(
                                  'Failed',
                                  getErrorMessage(err),
                                ),
                              );
                          },
                        },
                      ],
                    );
                  }
                : undefined
            }
          />
        );
      }}
    />
  );
}
