import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatInr } from '@/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { ListScreen, ListScreenHeader } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
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

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const s = status.toLowerCase();
  if (s.includes('post')) return 'success';
  if (s.includes('cancel')) return 'danger';
  if (s.includes('draft') || s.includes('submit') || s.includes('verif'))
    return 'warning';
  return 'default';
}

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
    <ListScreen
      title="Contribution receipts"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · funding receipts`
          : 'Select a project'
      }
      rightSlot={
        caps.canCreate ? (
          <Button
            label="New"
            onPress={() => navigation.navigate('ContributionReceiptForm')}
            style={{ minWidth: 88 }}
          />
        ) : null
      }
      header={
        balances && !loading && !error && !forbidden ? (
          <ListScreenHeader>
            <View style={styles.balances}>
              <Text style={styles.balanceText}>
                Project received {formatInr(balances.project.receivedAmount)}
              </Text>
              <Text style={styles.balanceMeta}>
                {balances.project.postedReceiptCount} posted
              </Text>
            </View>
          </ListScreenHeader>
        ) : null
      }
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No contribution receipts yet"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={item.receiptNumber}
          meta={`${formatInr(item.amount)} · ${String(item.receivedDate).slice(0, 10)} · ${paymentModeLabel(item.paymentMode)}`}
          status={receiptStatusLabel(item.status)}
          statusTone={statusTone(item.status)}
          onPress={() =>
            navigation.navigate('ContributionReceiptDetail', {
              receiptId: item.id,
            })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  balances: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  balanceText: { ...typography.bodyStrong, fontSize: 15 },
  balanceMeta: { ...typography.meta, marginTop: spacing.xs, fontSize: 13 },
});
