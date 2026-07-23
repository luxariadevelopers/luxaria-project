import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatInr } from '@/format';
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
  fetchContributionBalances,
  fetchContributionReceipts,
} from './api';
import { paymentModeLabel, receiptStatusLabel } from './labels';
import { resolveContributionReceiptCapabilities } from './permissions';
import type {
  ContributionBalances,
  PublicContributionReceipt,
} from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'ContributionReceiptList'>;

export function ContributionReceiptListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveContributionReceiptCapabilities(hasPermission);
  const { selectedProject, selectedProjectId } = useProject();
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicContributionReceipt[]>([]);
  const [balances, setBalances] = useState<ContributionBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing contribution_receipt.view');
        setLoading(false);
        return;
      }
      if (!selectedProjectId) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load contribution receipts');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const [list, bal] = await Promise.all([
          fetchContributionReceipts(selectedProjectId, { page: 1, limit: 50 }),
          fetchContributionBalances(selectedProjectId).catch(() => null),
        ]);
        setItems(list.items);
        setBalances(bal);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load receipts'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [caps.canView, isOnline, selectedProjectId],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return (
    <Screen
      title="Contribution receipts"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · funding receipts`
          : 'Select a project'
      }
      scroll={false}
      rightSlot={
        caps.canCreate ? (
          <Pressable
            style={styles.newBtn}
            onPress={() => navigation.navigate('ContributionReceiptForm')}
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
          emptyLabel="No contribution receipts yet"
          onRetry={() => void load('initial')}
        />
      ) : null}
      {!loading && !error && !forbidden && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            balances ? (
              <View style={styles.balances}>
                <Text style={styles.balanceText}>
                  Project received {formatInr(balances.project.receivedAmount)}
                </Text>
                <Text style={styles.balanceMeta}>
                  {balances.project.postedReceiptCount} posted
                </Text>
              </View>
            ) : null
          }
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
                navigation.navigate('ContributionReceiptDetail', {
                  receiptId: item.id,
                })
              }
            >
              <Text style={styles.code}>{item.receiptNumber}</Text>
              <Text style={styles.meta}>
                {formatInr(item.amount)} · {receiptStatusLabel(item.status)}
              </Text>
              <Text style={styles.meta}>
                {String(item.receivedDate).slice(0, 10)} ·{' '}
                {paymentModeLabel(item.paymentMode)}
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
  balances: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 12,
  },
  balanceText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  balanceMeta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
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
