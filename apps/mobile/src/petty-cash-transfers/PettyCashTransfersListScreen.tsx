import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ListRow } from '@/components/ListRow';
import { ListScreen } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { fetchPettyCashFundTransfers } from './api';
import { transferStatusLabel } from './labels';
import { resolvePettyCashTransferCapabilities } from './permissions';
import type { PublicPettyCashFundTransfer } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PettyCashTransfersList'>;

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const s = status.toLowerCase();
  if (s.includes('post') || s.includes('verif')) return 'success';
  if (s.includes('cancel')) return 'danger';
  if (s.includes('draft') || s.includes('pending')) return 'warning';
  return 'default';
}

export function PettyCashTransfersListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolvePettyCashTransferCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicPettyCashFundTransfer[]>([]);
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
        setError('Go online to load fund transfers');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const page = await fetchPettyCashFundTransfers({
          projectId: selectedProject.id,
          page: 1,
          limit: 50,
        });
        setItems(page.items);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load fund transfers'));
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
      title="Fund transfers"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · acknowledge / post`
          : 'Select project'
      }
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No fund transfers yet"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={item.transferNumber}
          meta={`${formatInr(item.amount)} · ${String(item.transferDate).slice(0, 10)}${
            item.status === 'draft' && caps.canAcknowledge
              ? ' · Tap to acknowledge'
              : ''
          }`}
          status={transferStatusLabel(item.status)}
          statusTone={statusTone(item.status)}
          onPress={() =>
            navigation.navigate('PettyCashTransferDetail', {
              transferId: item.id,
            })
          }
        />
      )}
    />
  );
}
