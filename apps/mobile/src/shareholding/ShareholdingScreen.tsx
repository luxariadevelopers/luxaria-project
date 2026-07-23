import { useCallback, useMemo, useState } from 'react';
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
import { formatInr } from '@/format';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import {
  fetchActiveShareholding,
  fetchDirectors,
  fetchShareholdingHistory,
} from '@/directors/api';
import type { PublicDirector, PublicShareholding } from '@/directors/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { resolveShareholdingCapabilities } from './permissions';
import {
  assessTotalPercentage,
  formatShareholdingPercent,
} from './totalPercentage';

type Props = NativeStackScreenProps<AppStackParamList, 'Shareholding'>;
type Tab = 'active' | 'history';

export function ShareholdingScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveShareholdingCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [tab, setTab] = useState<Tab>('active');
  const [holdings, setHoldings] = useState<PublicShareholding[]>([]);
  const [history, setHistory] = useState<PublicShareholding[]>([]);
  const [directors, setDirectors] = useState<PublicDirector[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const directorNameById = useMemo(
    () =>
      new Map(
        directors.map((row) => [
          row.id,
          `${row.directorCode} — ${row.fullName}`,
        ]),
      ),
    [directors],
  );

  const assessed = assessTotalPercentage(totalPercentage);
  const rows = tab === 'active' ? holdings : history;

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing shareholding.view');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load shareholding');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const [active, historyPage, directorPage] = await Promise.all([
          fetchActiveShareholding(),
          fetchShareholdingHistory({ page: 1, limit: 50 }),
          fetchDirectors({ page: 1, limit: 100 }),
        ]);
        setHoldings(active.holdings);
        setTotalPercentage(active.totalPercentage);
        setNote(active.note ?? '');
        setHistory(historyPage.items);
        setDirectors(directorPage.items);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load shareholding'));
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
      title="Shareholding"
      subtitle="Company equity"
      scroll={false}
      rightSlot={
        <Pressable
          style={styles.linkBtn}
          onPress={() => navigation.navigate('ShareholdingChangeRequests')}
        >
          <Text style={styles.linkBtnText}>Requests</Text>
        </Pressable>
      }
    >
      {loading || error || forbidden ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          onRetry={() => void load('initial')}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>
                  Total {formatShareholdingPercent(totalPercentage)}
                </Text>
                <Text
                  style={[
                    styles.summaryNote,
                    assessed.isValid ? styles.ok : styles.warn,
                  ]}
                >
                  {assessed.message}
                </Text>
                {note ? <Text style={styles.meta}>{note}</Text> : null}
              </View>

              {caps.canPostCapital && holdings.length > 0 ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('PostShareCapital')}
                >
                  <Text style={styles.primaryButtonText}>
                    Post share capital to bank
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.tabs}>
                <Pressable
                  style={[styles.tab, tab === 'active' && styles.tabActive]}
                  onPress={() => setTab('active')}
                >
                  <Text style={styles.tabText}>Active</Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, tab === 'history' && styles.tabActive]}
                  onPress={() => setTab('history')}
                >
                  <Text style={styles.tabText}>History</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <AsyncStatePanel
              empty
              emptyLabel={
                tab === 'active'
                  ? 'No active holdings'
                  : 'No shareholding history'
              }
            />
          }
          renderItem={({ item }) => {
            const capital = item.numberOfShares * item.faceValue;
            return (
              <View style={styles.card}>
                <Text style={styles.code}>
                  {directorNameById.get(item.directorId) ??
                    `Director …${item.directorId.slice(-6)}`}
                </Text>
                <Text style={styles.meta}>
                  {formatShareholdingPercent(item.percentage)} ·{' '}
                  {item.numberOfShares.toLocaleString('en-IN')} ×{' '}
                  {formatInr(item.faceValue)} = {formatInr(capital)}
                </Text>
                <Text style={styles.meta}>
                  {item.effectiveFrom.slice(0, 10)}
                  {item.effectiveTo
                    ? ` → ${item.effectiveTo.slice(0, 10)}`
                    : ' → open'}
                  {` · v${item.version}`}
                </Text>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  linkBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  linkBtnText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  header: { marginBottom: 8 },
  summary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 12,
  },
  summaryTitle: { color: colors.text, fontWeight: '700', fontSize: 17 },
  summaryNote: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  ok: { color: colors.textMuted },
  warn: { color: colors.danger },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: '#F4F0E6', fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tabActive: { borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: '600' },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  code: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
