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
import { listLabourAttendance } from './api';
import { resolveAttendanceCapabilities } from './permissions';
import type { PublicLabourAttendance } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'LabourAttendanceList'>;

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const s = status.toLowerCase();
  if (s === 'confirmed' || s === 'approved') return 'success';
  if (s === 'submitted' || s === 'pending') return 'warning';
  if (s === 'rejected' || s === 'cancelled') return 'danger';
  return 'default';
}

export function LabourAttendanceListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveAttendanceCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();

  const [items, setItems] = useState<PublicLabourAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing attendance.view permission');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load attendance sheets');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const rows = await listLabourAttendance({
          projectId: selectedProject.id,
          limit: 50,
        });
        setItems(rows);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load attendance'));
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
      title="Labour attendance"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · daily sheets`
          : 'Select a project first'
      }
      rightSlot={
        caps.canCreate ? (
          <Button
            label="New"
            onPress={() => navigation.navigate('LabourAttendanceForm')}
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
      emptyLabel="No attendance sheets yet"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={item.attendanceNumber}
          meta={[
            `${String(item.attendanceDate).slice(0, 10)} · ${item.totalWorkers} workers`,
            item.workLocation || null,
          ]
            .filter(Boolean)
            .join(' · ')}
          status={item.status}
          statusTone={statusTone(item.status)}
          onPress={() =>
            navigation.navigate('LabourAttendanceDetail', {
              attendanceId: item.id,
            })
          }
        />
      )}
    />
  );
}
