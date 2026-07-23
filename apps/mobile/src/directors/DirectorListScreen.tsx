import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchDirectors } from './api';
import { resolveDirectorCapabilities } from './permissions';
import type { PublicDirector } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'DirectorsList'>;

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
    <Screen
      title="Directors"
      subtitle="Company directors"
      scroll={false}
      rightSlot={
        caps.canCreate ? (
          <Pressable
            style={styles.newBtn}
            onPress={() => navigation.navigate('DirectorForm', {})}
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
          emptyLabel="No directors"
          onRetry={() => void load('initial')}
        />
      ) : null}
      {!loading && !error && !forbidden && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(row) => row.id}
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
                navigation.navigate('DirectorDetail', { directorId: item.id })
              }
            >
              <View style={styles.row}>
                <Text style={styles.code}>{item.directorCode}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.meta}>
                {[
                  item.userCode ? `User ${item.userCode}` : null,
                  item.employeeId ? `Emp ${item.employeeId}` : null,
                  item.din ? `DIN ${item.din}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </Text>
            </Pressable>
          )}
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
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: { color: colors.text, fontWeight: '700', fontSize: 15 },
  status: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  name: { color: colors.text, fontSize: 16, marginTop: 6, fontWeight: '600' },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
