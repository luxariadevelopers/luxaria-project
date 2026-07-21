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
import { getPurchaseRequest } from './api';
import { resolvePurchaseRequestCapabilities } from './permissions';
import type { PublicPurchaseRequest } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'PurchaseRequestDetail'>;

export function PurchaseRequestDetailScreen({ route }: Props) {
  const { requestId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolvePurchaseRequestCapabilities(hasPermission);
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicPurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canView) { setForbidden(true); setError('Missing purchase.view'); setLoading(false); return; }
    if (!isOnline) { setError('Go online'); setLoading(false); return; }
    setLoading(true);
    try {
      setItem(await getPurchaseRequest(requestId));
      setError(null); setForbidden(false);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load PR'));
    } finally {
      setLoading(false);
    }
  }, [caps.canView, isOnline, requestId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen title="Purchase request" subtitle={item?.requestNumber ?? requestId}>
      {loading || error || forbidden || !item ? (
        <AsyncStatePanel loading={loading} error={error} forbidden={forbidden} empty={!loading && !item} emptyLabel="Not found" onRetry={() => void load()} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.row}>Status: {item.status}</Text>
          <Text style={styles.row}>Required by: {String(item.requiredByDate).slice(0, 10)}</Text>
          <Text style={styles.row}>Priority: {item.priority}</Text>
          <Text style={styles.row}>Justification: {item.justification}</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16, gap: 8 },
  row: { color: colors.text, fontSize: 15 },
});
