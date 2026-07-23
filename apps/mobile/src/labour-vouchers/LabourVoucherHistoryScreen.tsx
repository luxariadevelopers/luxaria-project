import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { ListRow } from '@/components/ListRow';
import { ListScreen } from '@/components/ListScreen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { listLabourVouchers } from './api';
import { LABOUR_VOUCHER_PERMISSIONS } from './permissions';
import type { SignedPaymentVoucher } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'LabourVoucherHistory'>;

function statusTone(
  status: string,
): 'default' | 'success' | 'warning' | 'danger' {
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'posted' || s === 'paid') return 'success';
  if (s === 'submitted' || s === 'pending') return 'warning';
  if (s === 'rejected' || s === 'cancelled') return 'danger';
  return 'default';
}

export function LabourVoucherHistoryScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { selectedProject } = useProject();
  const { isOnline } = useNetwork();
  const canView = hasPermission(LABOUR_VOUCHER_PERMISSIONS.view);
  const canCreate = hasPermission(LABOUR_VOUCHER_PERMISSIONS.createOrSubmit);

  const [items, setItems] = useState<SignedPaymentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!canView) {
        setForbidden(true);
        setError('Missing payment.view permission');
        setLoading(false);
        return;
      }
      if (!selectedProject?.id) {
        setItems([]);
        setError('Select a project first');
        setLoading(false);
        return;
      }
      if (!isOnline) {
        setError('Go online to load labour voucher history');
        setLoading(false);
        return;
      }

      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const result = await listLabourVouchers({
          projectId: selectedProject.id,
          limit: 50,
        });
        setItems(result.items);
      } catch (err) {
        setForbidden(isForbiddenError(err));
        setError(getErrorMessage(err, 'Could not load labour vouchers'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView, isOnline, selectedProject?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return (
    <ListScreen
      title="Labour vouchers"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · history`
          : 'Select a project first'
      }
      rightSlot={
        canCreate ? (
          <Button
            label="New"
            onPress={() => navigation.navigate('NewLabourVoucher')}
            style={{ minWidth: 72 }}
          />
        ) : null
      }
      data={items}
      keyExtractor={(item) => item.id}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void load('refresh')}
      error={error}
      forbidden={forbidden}
      emptyLabel="No labour vouchers for this project yet"
      onRetry={() => void load('initial')}
      renderItem={({ item }) => (
        <ListRow
          title={item.voucherNumber}
          meta={`${item.recipientName} · ₹${item.netAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })} · ${item.workDescription}`}
          status={item.status}
          statusTone={statusTone(item.status)}
          onPress={() =>
            navigation.navigate('LabourVoucherDetail', {
              voucherId: item.id,
            })
          }
        />
      )}
    />
  );
}
