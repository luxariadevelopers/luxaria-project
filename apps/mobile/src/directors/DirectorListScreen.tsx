import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { ListScreen } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { fetchDirectors } from './api';
import { resolveDirectorCapabilities } from './permissions';
import type { PublicDirector } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'DirectorsList'>;

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const s = status.toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'resigned' || s === 'inactive') return 'warning';
  return 'default';
}

export function DirectorListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveDirectorCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicDirector[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing director.view');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load directors');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const page = await fetchDirectors({ page: 1, limit: 100 });
        setItems(page.items);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load directors'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [caps.canView, isOnline],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return (
    <ListScreen
      title="Directors"
      subtitle="Company directors"
      rightSlot={
        caps.canCreate ? (
          <Button
            label="New"
            onPress={() => navigation.navigate('DirectorForm', {})}
            style={{ minWidth: 88 }}
          />
        ) : null
      }
      data={items}
      keyExtractor={(row) => row.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No directors"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={`${item.directorCode} · ${item.fullName}`}
          meta={
            [
              item.userCode ? `User ${item.userCode}` : null,
              item.employeeId ? `Emp ${item.employeeId}` : null,
              item.din ? `DIN ${item.din}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || '—'
          }
          status={item.status}
          statusTone={statusTone(item.status)}
          onPress={() =>
            navigation.navigate('DirectorDetail', { directorId: item.id })
          }
        />
      )}
    />
  );
}
