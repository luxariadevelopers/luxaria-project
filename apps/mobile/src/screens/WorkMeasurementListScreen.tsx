import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ListScreen } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import {
  acknowledgeWorkMeasurement,
  fetchWorkMeasurements,
} from '@/work-measurement/api';
import { MeasurementRow } from '@/work-measurement/components/MeasurementRow';
import { resolveWorkMeasurementCapabilities } from '@/work-measurement/permissions';
import type { PublicWorkMeasurement } from '@/work-measurement/types';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkMeasurementList'>;

export function WorkMeasurementListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const caps = resolveWorkMeasurementCapabilities(hasPermission);

  const [items, setItems] = useState<PublicWorkMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const onAcknowledge = useCallback(
    async (id: string) => {
      if (!caps.canAcknowledge || !isOnline) {
        Alert.alert(
          'Acknowledge unavailable',
          !isOnline
            ? 'Measurement acknowledgment requires a network connection.'
            : 'Missing permission measurement.certify',
        );
        return;
      }
      setAcknowledgingId(id);
      try {
        const updated = await acknowledgeWorkMeasurement(id);
        setItems((prev) =>
          prev.map((row) => (row.id === id ? updated : row)),
        );
      } catch (err) {
        Alert.alert(
          'Acknowledge failed',
          getErrorMessage(err, 'Unable to acknowledge'),
        );
      } finally {
        setAcknowledgingId(null);
      }
    },
    [caps.canAcknowledge, isOnline],
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing permission measurement.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setItems([]);
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError(
          'Work measurements require a network connection to load. Capture new measurements offline from New measurement.',
        );
        setLoading(false);
        return;
      }

      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const result = await fetchWorkMeasurements({
          projectId: selectedProject.id,
          page: 1,
          limit: 50,
        });
        setItems(result.items);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load measurements'));
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
      title="Work Measurement"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · verified quantities with evidence`
          : 'Select a project first'
      }
      rightSlot={
        caps.canCreate ? (
          <Button
            label="New"
            onPress={() => navigation.navigate('WorkMeasurementForm')}
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
      emptyLabel="No measurements yet — capture site quantities with photos"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <MeasurementRow
          item={item}
          acknowledging={acknowledgingId === item.id}
          onAcknowledge={
            caps.canAcknowledge && item.status === 'submitted'
              ? () => void onAcknowledge(item.id)
              : undefined
          }
        />
      )}
    />
  );
}
