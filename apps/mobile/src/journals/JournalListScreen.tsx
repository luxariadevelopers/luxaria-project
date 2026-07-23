import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ListRow } from '@/components/ListRow';
import { ListScreen } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { fetchJournals } from './api';
import { resolveJournalCapabilities } from './permissions';
import type { PublicJournalEntry } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'JournalList'>;

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const s = status.toLowerCase();
  if (s.includes('post')) return 'success';
  if (s.includes('reverse') || s.includes('void')) return 'danger';
  if (s.includes('draft') || s.includes('submit')) return 'warning';
  return 'default';
}

export function JournalListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveJournalCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing journal.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load journals');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const page = await fetchJournals({
          projectId: selectedProject.id,
          page: 1,
          limit: 50,
        });
        setItems(page.items);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load journals'));
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
      title="Journals"
      subtitle={
        selectedProject ? selectedProject.projectCode : 'Select a project'
      }
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No journals yet"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={item.journalNumber}
          meta={`${formatDate(item.journalDate)} · ${formatInr(item.totalDebit)} · ${item.narration}`}
          status={item.status}
          statusTone={statusTone(item.status)}
          onPress={() =>
            navigation.navigate('JournalDetail', { journalId: item.id })
          }
        />
      )}
    />
  );
}
