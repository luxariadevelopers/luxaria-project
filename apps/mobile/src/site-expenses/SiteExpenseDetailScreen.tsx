import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { getSiteExpense } from './api';
import { resolveExpenseCapabilities } from './permissions';
import type { PublicSiteExpenseVoucher } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'SiteExpenseDetail'>;

export function SiteExpenseDetailScreen({ route }: Props) {
  const { expenseId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolveExpenseCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicSiteExpenseVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canView) { setForbidden(true); setError('Missing expense.view'); setLoading(false); return; }
    if (!isOnline) { setError('Go online to open expense'); setLoading(false); return; }
    setLoading(true);
    try {
      setItem(await getSiteExpense(expenseId));
      setError(null);
      setForbidden(false);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load expense'));
    } finally {
      setLoading(false);
    }
  }, [caps.canView, expenseId, isOnline]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen title="Site expense" subtitle={item?.voucherNumber ?? expenseId}>
      {loading || error || forbidden || !item ? (
        <AsyncStatePanel loading={loading} error={error} forbidden={forbidden} empty={!loading && !item} emptyLabel="Not found" onRetry={() => void load()} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.row}>Status: {item.status}</Text>
          <Text style={styles.row}>Amount: ₹{item.amount}</Text>
          <Text style={styles.row}>Paid to: {item.paidTo}</Text>
          <Text style={styles.row}>Purpose: {item.purpose}</Text>
          <Text style={styles.row}>Date: {String(item.expenseDate).slice(0, 10)}</Text>
          <Text style={styles.row}>Mode: {item.paymentMode}</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16, gap: 8 },
  row: { color: colors.text, fontSize: 15 },
});
