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
import { formatDate, formatInr } from '@/format';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fetchJournals } from './api';
import { resolveJournalCapabilities } from './permissions';
import type { PublicJournalEntry } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'JournalList'>;

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
    <Screen
      title="Journals"
      subtitle={
        selectedProject ? selectedProject.projectCode : 'Select a project'
      }
      scroll={false}
    >
      {loading || error || forbidden || (!loading && items.length === 0) ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !error && !forbidden && items.length === 0}
          emptyLabel="No journals yet"
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
                navigation.navigate('JournalDetail', { journalId: item.id })
              }
            >
              <Text style={styles.code}>{item.journalNumber}</Text>
              <Text style={styles.meta}>
                {formatDate(item.journalDate)} · {item.status} ·{' '}
                {formatInr(item.totalDebit)}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {item.narration}
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
