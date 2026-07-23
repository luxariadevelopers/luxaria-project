import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { ListScreen } from '@/components/ListScreen';
import { TextField } from '@/components/TextField';
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
import { colors, radii, spacing, typography } from '@/theme';
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
    <ListScreen
      title="Change requests"
      subtitle="Shareholding"
      data={items}
      keyExtractor={(row) => row.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No change requests"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => {
        const proposedTotal = sumHoldingPercentages(item.proposedHoldings);
        const assessed = assessTotalPercentage(proposedTotal);
        const isPending = item.status === ShareholdingChangeStatus.Pending;
        const isSelf = Boolean(user?.id && item.requestedBy === user.id);
        return (
          <FormSection
            title={String(item.status)}
            description={`Proposed ${formatShareholdingPercent(proposedTotal)}`}
            style={styles.card}
          >
            <Text style={styles.reason}>{item.reason}</Text>
            <Text style={styles.meta}>
              Requested {item.createdAt ? item.createdAt.slice(0, 16) : '—'}
              {item.approvalReference ? ` · ${item.approvalReference}` : ''}
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
                <Button
                  label="Approve"
                  disabled={busyId === item.id || isSelf}
                  loading={busyId === item.id}
                  onPress={() => onApprove(item)}
                />
                <TextField
                  label="Rejection reason"
                  value={rejectReason[item.id] ?? ''}
                  onChangeText={(v) =>
                    setRejectReason((prev) => ({
                      ...prev,
                      [item.id]: v,
                    }))
                  }
                  placeholder="Rejection reason"
                />
                <Button
                  label="Reject"
                  variant="danger"
                  disabled={
                    busyId === item.id || !(rejectReason[item.id]?.trim())
                  }
                  onPress={() => onReject(item)}
                />
              </View>
            ) : null}
          </FormSection>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  warn: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
  reason: { ...typography.body, fontSize: 15 },
  meta: { ...typography.meta, fontSize: 13, marginTop: spacing.xs },
  actions: { marginTop: spacing.md, gap: spacing.sm },
});
