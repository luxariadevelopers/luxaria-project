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
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { listLabourVouchers } from './api';
import { AsyncStatePanel } from './components/AsyncStatePanel';
import { LABOUR_VOUCHER_PERMISSIONS } from './permissions';
import type { SignedPaymentVoucher } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'LabourVoucherHistory'>;

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
    <Screen
      title="Labour vouchers"
      subtitle={
        selectedProject
          ? `${selectedProject.projectCode} · history`
          : 'Select a project first'
      }
      scroll={false}
      rightSlot={
        canCreate ? (
          <Pressable
            style={styles.newBtn}
            onPress={() => navigation.navigate('NewLabourVoucher')}
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
          emptyLabel="No labour vouchers for this project yet"
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
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate('LabourVoucherDetail', {
                  voucherId: item.id,
                })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.number}>{item.voucherNumber}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <Text style={styles.recipient}>{item.recipientName}</Text>
              <Text style={styles.meta} numberOfLines={2}>
                {item.workDescription}
              </Text>
              <Text style={styles.net}>
                Net ₹
                {item.netAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
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
  newBtnText: { color: '#F4F0E6', fontWeight: '700', fontSize: 13 },
  list: { paddingBottom: 28, gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  number: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  status: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  recipient: { color: colors.text, fontWeight: '600', marginBottom: 4 },
  meta: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  net: { marginTop: 8, color: colors.text, fontWeight: '700' },
});
