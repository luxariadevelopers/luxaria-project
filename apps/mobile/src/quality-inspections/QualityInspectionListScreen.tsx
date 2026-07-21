import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
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
import {
  completeQualityInspection,
  listQualityInspections,
  type PublicQualityInspection,
} from './api';

type Props = NativeStackScreenProps<AppStackParamList, 'QualityInspectionList'>;

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

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!canView) { setForbidden(true); setError('Missing quality.view'); setLoading(false); return; }
    if (!selectedProject?.id) { setError('Select a project first'); setLoading(false); return; }
    if (!isOnline) { setError('Go online to load quality inspections'); setLoading(false); return; }
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError(null); setForbidden(false);
    try {
      setItems(await listQualityInspections({ projectId: selectedProject.id }));
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load inspections'));
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [canView, isOnline, selectedProject?.id]);

  useFocusEffect(useCallback(() => { void load('initial'); }, [load]));

  return (
    <Screen title="Quality inspections" subtitle={selectedProject?.projectCode ?? 'Select project'} scroll={false}>
      {loading || error || forbidden || (!loading && items.length === 0) ? (
        <AsyncStatePanel loading={loading} error={error} forbidden={forbidden} empty={!loading && !error && !forbidden && items.length === 0} emptyLabel="No inspections" onRetry={() => void load('initial')} />
      ) : null}
      {!loading && !error && !forbidden && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => {
                if (!canInspect || String(item.status).toLowerCase() === 'completed') return;
                Alert.alert('Complete inspection', item.inspectionNumber || item.id, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Complete',
                    onPress: () => {
                      void completeQualityInspection(item.id)
                        .then(() => void load('refresh'))
                        .catch((err) => Alert.alert('Failed', getErrorMessage(err)));
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.code}>{item.inspectionNumber || item.id.slice(-8)}</Text>
              <Text style={styles.meta}>{item.status}{item.goodsReceiptId ? ` · GRN ${item.goodsReceiptId.slice(-6)}` : ''}</Text>
            </Pressable>
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, marginBottom: 10 },
  code: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
