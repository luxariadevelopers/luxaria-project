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
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { listLabourAttendance } from './api';
import { resolveAttendanceCapabilities } from './permissions';
import type { PublicLabourAttendance } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'LabourAttendanceList'>;

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
    <Screen
      title="Labour attendance"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · daily sheets`
          : 'Select a project first'
      }
      scroll={false}
      rightSlot={
        caps.canCreate ? (
          <Pressable
            style={styles.newBtn}
            onPress={() => navigation.navigate('LabourAttendanceForm')}
          >
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        ) : null
      }
    >
      {loading || error || forbidden || (!loading && items.length === 0) ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !error && !forbidden && items.length === 0}
          emptyLabel="No attendance sheets yet"
          onRetry={() => void load('initial')}
        />
      ) : null}

      {!loading && !error && !forbidden && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
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
                navigation.navigate('LabourAttendanceDetail', {
                  attendanceId: item.id,
                })
              }
            >
              <Text style={styles.code}>{item.attendanceNumber}</Text>
              <Text style={styles.meta}>
                {String(item.attendanceDate).slice(0, 10)} · {item.status} ·{' '}
                {item.totalWorkers} workers
              </Text>
              {item.workLocation ? (
                <Text style={styles.meta}>{item.workLocation}</Text>
              ) : null}
            </Pressable>
          )}
          contentContainerStyle={styles.list}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: { color: '#F4F0E6', fontWeight: '700' },
  list: { paddingBottom: 24, gap: 10 },
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
