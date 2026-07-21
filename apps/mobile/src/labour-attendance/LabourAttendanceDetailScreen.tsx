import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { confirmLabourAttendance, getLabourAttendance } from './api';
import { resolveAttendanceCapabilities } from './permissions';
import {
  LabourAttendanceStatus,
  type PublicLabourAttendance,
} from './types';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'LabourAttendanceDetail'
>;

export function LabourAttendanceDetailScreen({ route }: Props) {
  const { attendanceId } = route.params;
  const { hasPermission } = useAuth();
  const caps = resolveAttendanceCapabilities(hasPermission);
  const { isOnline } = useNetwork();

  const [item, setItem] = useState<PublicLabourAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!caps.canView) {
      setForbidden(true);
      setError('Missing attendance.view');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('Go online to open attendance detail');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItem(await getLabourAttendance(attendanceId));
    } catch (err) {
      setForbidden(isForbiddenError(err));
      setError(getErrorMessage(err, 'Could not load attendance'));
    } finally {
      setLoading(false);
    }
  }, [attendanceId, caps.canView, isOnline]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onConfirm = async () => {
    setActing(true);
    try {
      const updated = await confirmLabourAttendance(attendanceId);
      setItem(updated);
      Alert.alert('Confirmed', 'Attendance confirmed by supervisor');
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Could not confirm'));
    } finally {
      setActing(false);
    }
  };

  return (
    <Screen
      title="Attendance"
      subtitle={item?.attendanceNumber ?? attendanceId}
    >
      {loading || error || forbidden || !item ? (
        <AsyncStatePanel
          loading={loading}
          error={error}
          forbidden={forbidden}
          empty={!loading && !error && !forbidden && !item}
          emptyLabel="Attendance not found"
          onRetry={() => void load()}
        />
      ) : (
        <View style={styles.card}>
          <Text style={styles.row}>
            Date: {String(item.attendanceDate).slice(0, 10)}
          </Text>
          <Text style={styles.row}>Status: {item.status}</Text>
          <Text style={styles.row}>Workers: {item.totalWorkers}</Text>
          <Text style={styles.row}>
            Overtime: {item.totalOvertimeHours} hrs
          </Text>
          {item.workLocation ? (
            <Text style={styles.row}>Location: {item.workLocation}</Text>
          ) : null}
          {item.remarks ? (
            <Text style={styles.row}>Remarks: {item.remarks}</Text>
          ) : null}

          {caps.canConfirm &&
          item.status === LabourAttendanceStatus.Submitted ? (
            <Pressable
              style={[styles.btn, acting && styles.disabled]}
              disabled={acting}
              onPress={() => void onConfirm()}
            >
              <Text style={styles.btnText}>
                {acting ? 'Confirming…' : 'Confirm attendance'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
  row: { color: colors.text, fontSize: 15 },
  btn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#F4F0E6', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
