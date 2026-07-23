import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { listPettyCashRequirements } from './api';
import { resolvePettyCashCapabilities } from './permissions';
import {
  requestNumberOf,
  type PublicPettyCashRequirement,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PettyCashList'>;

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

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!caps.canView) { setForbidden(true); setError('Missing petty_cash.view'); setLoading(false); return; }
    if (!selectedProject?.id) { setError('Select a project first'); setLoading(false); return; }
    if (!isOnline) { setError('Go online to load petty cash'); setLoading(false); return; }
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError(null); setForbidden(false);
    try {
      setItems(await listPettyCashRequirements({ projectId: selectedProject.id }));
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load petty cash'));
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [caps.canView, isOnline, selectedProject?.id]);

  useFocusEffect(useCallback(() => { void load('initial'); }, [load]));

  return (
    <Screen
      title="Petty cash"
      subtitle={selectedProject?.projectCode ?? 'Select project'}
      scroll={false}
      rightSlot={caps.canRequest ? (
        <Pressable style={styles.newBtn} onPress={() => navigation.navigate('PettyCashForm')}>
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      ) : null}
    >
      {loading || error || forbidden || (!loading && items.length === 0) ? (
        <AsyncStatePanel loading={loading} error={error} forbidden={forbidden} empty={!loading && !error && !forbidden && items.length === 0} emptyLabel="No petty cash requests" onRetry={() => void load('initial')} />
      ) : null}
      {!loading && !error && !forbidden && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('PettyCashDetail', { requestId: item.id })}>
              <Text style={styles.code}>{requestNumberOf(item)}</Text>
              <Text style={styles.meta}>{item.status} · {String(item.weekStartDate).slice(0, 10)} → {String(item.weekEndDate).slice(0, 10)}</Text>
            </Pressable>
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8 },
  newBtnText: { color: '#F4F0E6', fontWeight: '700' },
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, marginBottom: 10 },
  code: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
