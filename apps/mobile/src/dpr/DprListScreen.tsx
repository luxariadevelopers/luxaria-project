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

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!canView) { setForbidden(true); setError('Missing dpr.view'); setLoading(false); return; }
    if (!selectedProject?.id) { setError('Select a project first'); setLoading(false); return; }
    if (!isOnline) { setError('Go online to load DPRs'); setLoading(false); return; }
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError(null); setForbidden(false);
    try {
      setItems(await listDailyProgressReports({ projectId: selectedProject.id }));
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load DPRs'));
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [canView, isOnline, selectedProject?.id]);

  useFocusEffect(useCallback(() => { void load('initial'); }, [load]));

  return (
    <Screen
      title="Daily progress"
      subtitle={selectedProject?.projectCode ?? 'Select project'}
      scroll={false}
      rightSlot={canCreate ? (
        <Pressable style={styles.newBtn} onPress={() => navigation.navigate('DailyProgressReport')}>
          <Text style={styles.newBtnText}>Capture</Text>
        </Pressable>
      ) : null}
    >
      {loading || error || forbidden || (!loading && items.length === 0) ? (
        <AsyncStatePanel loading={loading} error={error} forbidden={forbidden} empty={!loading && !error && !forbidden && items.length === 0} emptyLabel="No DPRs yet" onRetry={() => void load('initial')} />
      ) : null}
      {!loading && !error && !forbidden && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('DprDetail', { dprId: item.id })}>
              <Text style={styles.code}>{item.dprNumber}</Text>
              <Text style={styles.meta}>{String(item.reportDate).slice(0, 10)} · {item.status} · labour {item.labourCount}</Text>
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
