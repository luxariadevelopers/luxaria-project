import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { getDailyProgressReport, reviewDailyProgressReport } from './api';
import { DprStatus, type PublicDailyProgressReport } from './types';

type Props = NativeStackScreenProps<AppStackParamList, 'DprDetail'>;

export function DprDetailScreen({ route }: Props) {
  const { dprId } = route.params;
  const { hasPermission } = useAuth();
  const canView = hasPermission('dpr.view');
  const canReview = hasPermission('dpr.review');
  const { isOnline } = useNetwork();
  const [item, setItem] = useState<PublicDailyProgressReport | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!canView) { setForbidden(true); setError('Missing dpr.view'); setLoading(false); return; }
    if (!isOnline) { setError('Go online'); setLoading(false); return; }
    setLoading(true);
    try {
      setItem(await getDailyProgressReport(dprId));
      setError(null); setForbidden(false);
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load DPR'));
    } finally {
      setLoading(false);
    }
  }, [canView, dprId, isOnline]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onReview = async () => {
    setActing(true);
    try {
      const updated = await reviewDailyProgressReport(dprId, notes.trim() || null);
      setItem(updated);
      Alert.alert('Reviewed', updated.dprNumber);
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Review failed'));
    } finally {
      setActing(false);
    }
  };

  return (
    <Screen title="DPR" subtitle={item?.dprNumber ?? dprId}>
      {loading || error || forbidden || !item ? (
        <AsyncStatePanel loading={loading} error={error} forbidden={forbidden} empty={!loading && !item} emptyLabel="Not found" onRetry={() => void load()} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.row}>Date: {String(item.reportDate).slice(0, 10)}</Text>
          <Text style={styles.row}>Status: {item.status}</Text>
          <Text style={styles.row}>Labour: {item.labourCount}</Text>
          <Text style={styles.row}>Work: {item.workPerformed || '—'}</Text>
          {canReview && item.status === DprStatus.Submitted ? (
            <>
              <Text style={styles.label}>Review notes</Text>
              <TextInput style={styles.input} value={notes} onChangeText={setNotes} />
              <Pressable style={[styles.btn, acting && styles.disabled]} disabled={acting} onPress={() => void onReview()}>
                <Text style={styles.btnText}>{acting ? 'Reviewing…' : 'Mark reviewed'}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16, gap: 8 },
  row: { color: colors.text, fontSize: 15 },
  label: { color: colors.textMuted, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, color: colors.text, padding: 10, backgroundColor: colors.background },
  btn: { marginTop: 12, backgroundColor: colors.primary, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
