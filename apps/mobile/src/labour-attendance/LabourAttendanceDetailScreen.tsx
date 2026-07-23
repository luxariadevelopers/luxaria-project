import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AsyncStatePanel } from '@/components/AsyncStatePanel';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { useNetwork } from '@/context/NetworkContext';
import type { AppStackParamList } from '@/navigation/types';
import { spacing, typography } from '@/theme';
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
        <FormSection title="Sheet">
          <Field label="Date" value={String(item.attendanceDate).slice(0, 10)} />
          <Field label="Status" value={item.status} />
          <Field label="Workers" value={String(item.totalWorkers)} />
          <Field label="Overtime" value={`${item.totalOvertimeHours} hrs`} />
          {item.workLocation ? (
            <Field label="Location" value={item.workLocation} />
          ) : null}
          {item.remarks ? <Field label="Remarks" value={item.remarks} /> : null}

          {caps.canConfirm &&
          item.status === LabourAttendanceStatus.Submitted ? (
            <Button
              label="Confirm attendance"
              loading={acting}
              onPress={() => void onConfirm()}
              style={styles.action}
            />
          ) : null}
        </FormSection>
      )}
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    marginBottom: 2,
  },
  value: {
    ...typography.body,
    fontSize: 15,
  },
  action: {
    marginTop: spacing.md,
  },
});
