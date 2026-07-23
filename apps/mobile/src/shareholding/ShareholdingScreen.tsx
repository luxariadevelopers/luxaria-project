import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { formatInr } from '@/format';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ListRow } from '@/components/ListRow';
import { ListScreen, ListScreenHeader } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import {
  fetchActiveShareholding,
  fetchDirectors,
  fetchShareholdingHistory,
} from '@/directors/api';
import type { PublicDirector, PublicShareholding } from '@/directors/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
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
    <ListScreen
      title="Shareholding"
      subtitle="Company equity"
      rightSlot={
        <Button
          label="Requests"
          variant="secondary"
          onPress={() => navigation.navigate('ShareholdingChangeRequests')}
          style={{ minWidth: 96 }}
        />
      }
      header={
        !loading && !error && !forbidden ? (
          <ListScreenHeader>
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
              <Button
                label="Post share capital to bank"
                onPress={() => navigation.navigate('PostShareCapital')}
                style={styles.primaryButton}
              />
            ) : null}

            <View style={styles.tabs}>
              <Chip
                label="Active"
                selected={tab === 'active'}
                onPress={() => setTab('active')}
                style={styles.tab}
              />
              <Chip
                label="History"
                selected={tab === 'history'}
                onPress={() => setTab('history')}
                style={styles.tab}
              />
            </View>
          </ListScreenHeader>
        ) : null
      }
      data={rows}
      keyExtractor={(row) => row.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel={
        tab === 'active' ? 'No active holdings' : 'No shareholding history'
      }
      onRetry={() => void load('initial')}
      renderItem={({ item }) => {
        const capital = item.numberOfShares * item.faceValue;
        return (
          <ListRow
            title={
              directorNameById.get(item.directorId) ??
              `Director …${item.directorId.slice(-6)}`
            }
            meta={`${formatShareholdingPercent(item.percentage)} · ${item.numberOfShares.toLocaleString('en-IN')} × ${formatInr(item.faceValue)} = ${formatInr(capital)} · ${item.effectiveFrom.slice(0, 10)}${
              item.effectiveTo
                ? ` → ${item.effectiveTo.slice(0, 10)}`
                : ' → open'
            } · v${item.version}`}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  summary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  summaryTitle: { ...typography.bodyStrong, fontSize: 17 },
  summaryNote: { marginTop: spacing.sm, fontSize: 13, lineHeight: 18 },
  ok: { color: colors.textMuted },
  warn: { color: colors.danger },
  meta: { ...typography.meta, marginTop: spacing.xs, fontSize: 13 },
  primaryButton: { marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1 },
});
