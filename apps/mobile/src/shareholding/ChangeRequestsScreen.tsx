import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import {
  approveShareholdingChange,
  fetchShareholdingChangeRequests,
  rejectShareholdingChange,
} from '@/directors/api';
import {
  ShareholdingChangeStatus,
  type PublicShareholdingChangeRequest,
} from '@/directors/types';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { resolveShareholdingCapabilities } from './permissions';
import {
  assessTotalPercentage,
  formatShareholdingPercent,
  sumHoldingPercentages,
} from './totalPercentage';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'ShareholdingChangeRequests'
>;

export function ChangeRequestsScreen(_props: Props) {
  const { hasPermission, user } = useAuth();
  const caps = resolveShareholdingCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [items, setItems] = useState<PublicShareholdingChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!caps.canView) {
        setForbidden(true);
        setError('Missing shareholding.view');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load change requests');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const page = await fetchShareholdingChangeRequests({ limit: 50 });
        setItems(page.items);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load change requests'));
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

  const onApprove = (req: PublicShareholdingChangeRequest) => {
    Alert.alert(
      'Approve shareholding change?',
      'Approving closes prior rows and inserts a new version.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            void (async () => {
              setBusyId(req.id);
              try {
                await approveShareholdingChange(req.id);
                Alert.alert('Approved', 'New shareholding version recorded');
                await load('refresh');
              } catch (err) {
                Alert.alert(
                  'Approve failed',
                  getErrorMessage(err, 'Approve failed'),
                );
                await load('refresh');
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const onReject = (req: PublicShareholdingChangeRequest) => {
    const reason = rejectReason[req.id]?.trim();
    if (!reason) {
      Alert.alert('Rejection reason required');
      return;
    }
    void (async () => {
      setBusyId(req.id);
      try {
        await rejectShareholdingChange(req.id, { rejectionReason: reason });
        Alert.alert('Rejected', 'Shareholding change rejected');
        await load('refresh');
      } catch (err) {
        Alert.alert('Reject failed', getErrorMessage(err, 'Reject failed'));
      } finally {
        setBusyId(null);
      }
    })();
  };

  return (
    <Screen title="Change requests" subtitle="Shareholding" scroll={false}>
      {loading || error || forbidden || (!loading && items.length === 0) ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !error && !forbidden && items.length === 0}
          emptyLabel="No change requests"
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
          renderItem={({ item }) => {
            const proposedTotal = sumHoldingPercentages(item.proposedHoldings);
            const assessed = assessTotalPercentage(proposedTotal);
            const isPending =
              item.status === ShareholdingChangeStatus.Pending;
            const isSelf = Boolean(
              user?.id && item.requestedBy === user.id,
            );
            return (
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.status}>{String(item.status)}</Text>
                  <Text
                    style={[
                      styles.percent,
                      assessed.isValid ? styles.ok : styles.warn,
                    ]}
                  >
                    Proposed {formatShareholdingPercent(proposedTotal)}
                  </Text>
                </View>
                <Text style={styles.reason}>{item.reason}</Text>
                <Text style={styles.meta}>
                  Requested{' '}
                  {item.createdAt ? item.createdAt.slice(0, 16) : '—'}
                  {item.approvalReference
                    ? ` · ${item.approvalReference}`
                    : ''}
                </Text>
                {!assessed.isValid ? (
                  <Text style={styles.warn}>{assessed.message}</Text>
                ) : null}
                {item.rejectionReason ? (
                  <Text style={styles.meta}>
                    Rejection: {item.rejectionReason}
                  </Text>
                ) : null}

                {isPending && caps.canApprove ? (
                  <View style={styles.actions}>
                    {isSelf ? (
                      <Text style={styles.warn}>
                        You proposed this request — self-approval is blocked.
                      </Text>
                    ) : null}
                    <Pressable
                      style={[
                        styles.approveBtn,
                        (busyId === item.id || isSelf) && styles.disabled,
                      ]}
                      disabled={busyId === item.id || isSelf}
                      onPress={() => onApprove(item)}
                    >
                      <Text style={styles.approveText}>Approve</Text>
                    </Pressable>
                    <TextInput
                      style={styles.input}
                      value={rejectReason[item.id] ?? ''}
                      onChangeText={(v) =>
                        setRejectReason((prev) => ({
                          ...prev,
                          [item.id]: v,
                        }))
                      }
                      placeholder="Rejection reason"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Pressable
                      style={[
                        styles.rejectBtn,
                        (busyId === item.id ||
                          !(rejectReason[item.id]?.trim())) &&
                          styles.disabled,
                      ]}
                      disabled={
                        busyId === item.id ||
                        !(rejectReason[item.id]?.trim())
                      }
                      onPress={() => onReject(item)}
                    >
                      <Text style={styles.rejectText}>Reject</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }}
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
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    color: colors.text,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  percent: { fontSize: 13, fontWeight: '600' },
  ok: { color: colors.textMuted },
  warn: { color: colors.danger, fontSize: 13 },
  reason: { color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 13 },
  actions: { marginTop: 8, gap: 8 },
  approveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveText: { color: '#F4F0E6', fontWeight: '700' },
  rejectBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectText: { color: colors.danger, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disabled: { opacity: 0.5 },
});
