import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import { formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchPettyCashFundTransfers } from './api';
import { transferStatusLabel } from './labels';
import { resolvePettyCashTransferCapabilities } from './permissions';
import type { PublicPettyCashFundTransfer } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PettyCashTransfersList'>;

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
    <Screen
      title="Fund transfers"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · acknowledge / post`
          : 'Select project'
      }
      scroll={false}
    >
      {loading || error || forbidden || (!loading && items.length === 0) ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !error && !forbidden && items.length === 0}
          emptyLabel="No fund transfers yet"
          onRetry={() => void load('initial')}
        />
      ) : null}
      {!loading && !error && !forbidden && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate('PettyCashTransferDetail', {
                  transferId: item.id,
                })
              }
            >
              <Text style={styles.code}>{item.transferNumber}</Text>
              <Text style={styles.meta}>
                {transferStatusLabel(item.status)} · {formatInr(item.amount)}
              </Text>
              <Text style={styles.meta}>
                {String(item.transferDate).slice(0, 10)}
                {item.status === 'draft' && caps.canAcknowledge
                  ? ' · Tap to acknowledge'
                  : ''}
              </Text>
            </Pressable>
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  code: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
