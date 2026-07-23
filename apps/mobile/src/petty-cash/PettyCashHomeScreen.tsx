import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
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
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { resolvePettyCashTransferCapabilities } from '@/petty-cash-transfers';
import { colors } from '@/theme/colors';
import { listPettyCashRequirements } from './api';
import { BalanceCard } from './BalanceCard';
import {
  fetchCashAccountBalances,
  fetchPettyCashAccounts,
} from './cashBalanceApi';
import { resolvePettyCashCapabilities } from './permissions';
import type { CashBalanceView, PublicCashAccount } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PettyCashHome'>;

export function PettyCashHomeScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolvePettyCashCapabilities(hasPermission);
  const transferCaps = resolvePettyCashTransferCapabilities(hasPermission);
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();

  const [accounts, setAccounts] = useState<PublicCashAccount[]>([]);
  const [balances, setBalances] = useState<CashBalanceView[] | undefined>();
  const [unsettledTotal, setUnsettledTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const canEnter =
    caps.canView || caps.canRequest || caps.canViewCash || transferCaps.canView;

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!canEnter) {
        setForbidden(true);
        setError('Missing petty_cash.view or cash.view');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load petty cash');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);

      try {
        let nextAccounts: PublicCashAccount[] = [];
        if (caps.canViewCash) {
          setBalanceLoading(true);
          nextAccounts = await fetchPettyCashAccounts(selectedProject.id);
          setAccounts(nextAccounts);
          const openIds = nextAccounts
            .filter((a) => a.status !== 'closed')
            .map((a) => a.id);
          setBalances(await fetchCashAccountBalances(openIds));
        } else {
          setAccounts([]);
          setBalances(undefined);
        }

        if (caps.canView) {
          const reqs = await listPettyCashRequirements({
            projectId: selectedProject.id,
          });
          const unsettled = reqs.reduce(
            (sum, r) => sum + (Number(r.previousUnsettledAmount) || 0),
            0,
          );
          setUnsettledTotal(unsettled);
        } else {
          setUnsettledTotal(0);
        }
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load petty cash home'));
      } finally {
        setBalanceLoading(false);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      canEnter,
      caps.canView,
      caps.canViewCash,
      isOnline,
      selectedProject?.id,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return (
    <Screen
      title="Petty cash"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · cash float`
          : 'Select project'
      }
      scroll={false}
    >
      {loading || error || forbidden ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={false}
          emptyLabel=""
          onRetry={() => void load('initial')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor={colors.primary}
            />
          }
        >
          {caps.canViewCash ? (
            <BalanceCard
              accounts={accounts}
              balances={balances}
              loading={balanceLoading}
              previousUnsettledTotal={unsettledTotal}
            />
          ) : (
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>
                Cash balances require cash.view. You can still open requests and
                transfers with your petty-cash permissions.
              </Text>
              {unsettledTotal > 0 ? (
                <Text style={[styles.noteText, styles.unsettled]}>
                  Previous unsettled (from requests): recorded on open weeks.
                </Text>
              ) : null}
            </View>
          )}

          <Text style={styles.section}>Actions</Text>

          {caps.canView ? (
            <Pressable
              style={styles.linkBtn}
              onPress={() => navigation.navigate('PettyCashList')}
            >
              <Text style={styles.linkBtnText}>Request list</Text>
            </Pressable>
          ) : null}

          {caps.canRequest ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('PettyCashForm')}
            >
              <Text style={styles.primaryBtnText}>New request</Text>
            </Pressable>
          ) : null}

          {transferCaps.canView ? (
            <Pressable
              style={styles.linkBtn}
              onPress={() => navigation.navigate('PettyCashTransfersList')}
            >
              <Text style={styles.linkBtnText}>Fund transfers</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  noteCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 14,
  },
  noteText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  unsettled: { marginTop: 8, color: colors.text },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  linkBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  linkBtnText: { color: colors.text, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#F4F0E6', fontWeight: '700' },
});
